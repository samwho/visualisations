import { customHash } from "./model/CustomHash";
import {
	bucketIndex,
	getHashFunction,
	type HashFunction,
} from "./model/Hashers";
import {
	HeatMapModel,
	InputSequence,
	type InputSource,
} from "./model/HeatMapModel";
import type {
	HeatMapConfig,
	HeatMapRequest,
	HeatMapStatus,
} from "./runtime/HeatMapProtocol";

// Comparisons reconstruct one dataset, including while old/new requests overlap.
const inputCache = new Map<string, Promise<InputSequence>>();
function sharedInputs(source: InputSource): Promise<InputSequence> {
	const key = `${source.valueFn}/${source.randomSeed}/${source.firstIndex}`;
	let inputs = inputCache.get(key);
	if (!inputs) {
		inputs = InputSequence.create(source).catch((error) => {
			if (inputCache.get(key) === inputs) {
				inputCache.delete(key);
			}
			throw error;
		});
		inputCache.set(key, inputs);
		if (inputCache.size > 2) {
			inputCache.delete(inputCache.keys().next().value!);
		}
	}
	return inputs;
}

class HeatMapRenderer {
	private readonly context: OffscreenCanvasRenderingContext2D;

	private readonly colorProbe = new OffscreenCanvas(1, 1).getContext("2d")!;

	private pixels?: ImageData;

	private color = "";

	private config?: HeatMapConfig;

	private latest?: HeatMapConfig;

	private generation = 0;

	private visible = true;

	private timer?: ReturnType<typeof setTimeout>;

	private inputs?: InputSequence;

	private model?: HeatMapModel;

	private hash: HashFunction = getHashFunction("murmur3");

	private attemptedSource?: number;

	private compilation?: Promise<void>;

	private failed = false;

	private preparing = false;

	private lastPaint = 0;

	// Finished alpha values survive theme changes without keeping the hash models.
	private readonly seedCache = new Map<number, Uint8Array>();

	private seedCacheKey = "";

	constructor(
		private readonly id: number,
		private readonly canvas: OffscreenCanvas,
	) {
		this.context = canvas.getContext("2d")!;
	}

	private send(message: HeatMapStatus): void {
		// oxlint-disable-next-line unicorn/require-post-message-target-origin -- A dedicated worker has no Window target origin.
		self.postMessage({ ...message, id: this.id });
	}

	private paint(settings: HeatMapConfig, cachedAlpha?: Uint8Array): boolean {
		let changed = false;
		if (
			this.canvas.width !== settings.columns ||
			this.canvas.height !== settings.rows
		) {
			this.canvas.width = settings.columns;
			this.canvas.height = settings.rows;
			this.pixels = undefined;
		}
		if (!this.pixels) {
			this.pixels = new ImageData(settings.columns, settings.rows);
			this.color = "";
			changed = true;
		}
		const data = this.pixels.data;
		if (this.color !== settings.color) {
			this.color = settings.color;
			this.colorProbe.fillStyle = settings.color;
			this.colorProbe.fillRect(0, 0, 1, 1);
			const [red, green, blue] = this.colorProbe.getImageData(0, 0, 1, 1).data;
			for (let i = 0; i < data.length; i += 4) {
				data[i] = red!;
				data[i + 1] = green!;
				data[i + 2] = blue!;
			}
			changed = true;
		}
		const maximum = this.model?.maximum ?? 1;
		for (let i = 0; i < settings.columns * settings.rows; i++) {
			const alpha = cachedAlpha
				? cachedAlpha[i]!
				: Math.min(255, Math.round((this.model!.counts[i]! / maximum) * 255));
			const offset = i * 4 + 3;
			if (data[offset] !== alpha) {
				data[offset] = alpha;
				changed = true;
			}
		}
		// One pixel per bucket; CSS scales the bitmap without smoothing or a retina-sized buffer.
		if (changed) {
			this.context.putImageData(this.pixels, 0, 0);
		}
		return changed;
	}

	private tick = (): void => {
		clearTimeout(this.timer);
		this.timer = undefined;
		if (
			!this.visible ||
			!this.config ||
			this.compilation ||
			this.preparing ||
			this.failed
		) {
			return;
		}
		try {
			const cachedAlpha = this.seedCacheKey
				? this.seedCache.get(this.config.seed)
				: undefined;
			if (cachedAlpha) {
				this.paint(this.config, cachedAlpha);
				this.send({
					type: "frame",
					generation: this.generation,
					complete: true,
				});
				return;
			}
			if (!this.model) {
				return;
			}
			const started = performance.now();
			if (!this.model.prepare(this.config.iterations)) {
				this.timer = setTimeout(this.tick, 0);
				return;
			}
			const complete = this.model.advance(
				this.config.progress,
				Math.max(0, 4 - (performance.now() - started)),
			);
			if (complete || performance.now() - this.lastPaint >= 16) {
				const changed = this.paint(this.config);
				this.lastPaint = performance.now();
				if (complete && this.seedCacheKey) {
					const alpha = new Uint8Array(this.model.counts.length);
					for (let i = 0; i < alpha.length; i++) {
						alpha[i] = this.pixels!.data[i * 4 + 3]!;
					}
					this.seedCache.set(this.config.seed, alpha);
					if (this.seedCache.size > this.config.seedCacheLimit) {
						this.seedCache.delete(this.seedCache.keys().next().value!);
					}
				}
				if (changed || complete) {
					this.send({ type: "frame", generation: this.generation, complete });
				}
			}
			if (!complete) {
				this.timer = setTimeout(this.tick, 0);
			}
		} catch (error) {
			this.failed = true;
			this.send({
				type: "error",
				generation: this.generation,
				message: String(error),
			});
		}
	};

	private async compile(settings: HeatMapConfig): Promise<void> {
		const source = settings.source!;
		const url = URL.createObjectURL(
			new Blob([source.code!], { type: "text/javascript" }),
		);
		try {
			// Reader code executes in this worker; it is not a security sandbox.
			const candidate = customHash(await import(url));
			if (source.id !== this.attemptedSource) {
				return;
			}
			bucketIndex(candidate("test", settings.seed), 16);
			this.hash = candidate;
			this.model = undefined;
			this.send({ type: "compiled", sourceId: source.id });
		} catch (error) {
			if (source.id === this.attemptedSource) {
				this.send({
					type: "error",
					generation: this.generation,
					sourceId: source.id,
					message: String(error),
				});
			}
		} finally {
			URL.revokeObjectURL(url);
		}
	}

	private async configure(settings: HeatMapConfig): Promise<void> {
		const generation = this.generation;
		this.preparing = true;
		try {
			const inputs = await sharedInputs(settings.inputs);
			if (generation !== this.generation) {
				return;
			}
			const old = this.config;
			this.config = settings;
			const seedCacheKey =
				settings.seedCacheLimit > 0 && settings.progress === settings.iterations
					? `${settings.inputs.valueFn}/${settings.inputs.randomSeed}/${settings.inputs.firstIndex}/${settings.hashFn}/${settings.source?.id ?? ""}/${settings.iterations}/${settings.columns}/${settings.rows}`
					: "";
			if (seedCacheKey !== this.seedCacheKey) {
				this.seedCache.clear();
				this.seedCacheKey = seedCacheKey;
			}
			if (
				this.inputs !== inputs ||
				old?.seed !== settings.seed ||
				old?.columns !== settings.columns ||
				old?.rows !== settings.rows ||
				old?.hashFn !== settings.hashFn
			) {
				this.inputs = inputs;
				this.model = undefined;
			}
			if (!settings.source) {
				if (old?.source) {
					this.model = undefined;
				}
				this.hash = getHashFunction(settings.hashFn);
			}
			if (this.seedCache.has(settings.seed)) {
				this.model = undefined;
			} else {
				this.model ??= new HeatMapModel(
					inputs,
					this.hash,
					settings.seed,
					settings.columns * settings.rows,
				);
			}
			this.preparing = false;
			this.tick();
		} catch (error) {
			if (generation !== this.generation) {
				return;
			}
			this.preparing = false;
			this.failed = true;
			this.send({
				type: "error",
				generation,
				message: `Unable to load inputs: ${String(error)}`,
			});
		}
	}

	receive(message: HeatMapRequest): void {
		if (message.type === "visibility") {
			this.visible = message.visible;
			if (this.visible) {
				this.tick();
			} else {
				clearTimeout(this.timer);
			}
			return;
		}
		if (message.type !== "render") {
			return;
		}
		clearTimeout(this.timer);
		this.generation = message.generation;
		this.send({ type: "accepted", generation: this.generation });
		const settings = message.config;
		this.latest = settings;
		if (!settings.source) {
			this.attemptedSource = undefined;
			this.compilation = undefined;
		}
		if (settings.source && settings.source.id !== this.attemptedSource) {
			this.attemptedSource = settings.source.id;
			this.failed = false;
			const sourceId = settings.source.id;
			this.compilation = this.compile(settings).finally(() => {
				if (this.attemptedSource !== sourceId) {
					return;
				}
				this.compilation = undefined;
				void this.configure(this.latest!);
			});
		} else if (!this.compilation) {
			this.failed = false;
			void this.configure(settings);
		}
	}

	dispose(): void {
		this.generation++;
		clearTimeout(this.timer);
		this.attemptedSource = undefined;
	}
}

const renderers = new Map<number, HeatMapRenderer>();
self.addEventListener("message", (event: MessageEvent<HeatMapRequest>) => {
	const message = event.data;
	if (message.type === "init") {
		renderers.set(message.id, new HeatMapRenderer(message.id, message.canvas));
	} else if (message.type === "remove") {
		renderers.get(message.id)?.dispose();
		renderers.delete(message.id);
	} else {
		renderers.get(message.id)?.receive(message);
	}
});
