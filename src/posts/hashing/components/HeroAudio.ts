const SAMPLE_COUNT = 12;
const MAX_VOICES = 8;

function sampleURL(index: number): string {
	return `/audio/hashing-flips/flip-${String(index + 1).padStart(2, "0")}.wav`;
}

/** Created only by the unmute gesture; silent renders never request audio. */
export class HeroAudio {
	private context?: AudioContext;

	private gain?: GainNode;

	private buffers: AudioBuffer[] = [];

	private readonly active = new Set<AudioBufferSourceNode>();

	private generation = 0;

	private loading?: Promise<void>;

	async enable(): Promise<void> {
		if (!this.context) {
			this.context = new AudioContext();
			this.gain = this.context.createGain();
			this.gain.gain.value = 0.12;
			this.gain.connect(this.context.destination);
		}
		const context = this.context;
		// Resume during the gesture so iOS can play subsequent flip sounds.
		const resumed = context.resume();
		this.loading ??= this.preload(context);
		try {
			await Promise.all([resumed, this.loading]);
		} catch {
			this.dispose();
			throw new Error("Unable to load flip sounds");
		}
	}

	private async preload(context: AudioContext): Promise<void> {
		const generation = ++this.generation;
		const buffers = await Promise.all(
			Array.from({ length: SAMPLE_COUNT }, async (_, index) => {
				const response = await fetch(sampleURL(index));
				if (!response.ok) {
					throw new Error("Unable to load flip sounds");
				}
				return context.decodeAudioData(await response.arrayBuffer());
			}),
		);
		if (generation === this.generation) {
			this.buffers = buffers;
		}
	}

	play(): void {
		if (
			this.context?.state !== "running" ||
			!this.gain ||
			this.buffers.length === 0 ||
			this.active.size >= MAX_VOICES
		) {
			return;
		}
		// iOS Safari stalls when each flap reopens a native media source.
		const source = this.context.createBufferSource();
		source.buffer =
			this.buffers[Math.floor(Math.random() * this.buffers.length)]!;
		source.connect(this.gain);
		this.active.add(source);
		source.addEventListener(
			"ended",
			() => {
				this.active.delete(source);
				source.disconnect();
			},
			{ once: true },
		);
		source.start();
	}

	stop(): void {
		for (const source of this.active) {
			source.stop();
		}
		this.active.clear();
	}

	dispose(): void {
		this.stop();
		this.generation++;
		this.loading = undefined;
		this.buffers = [];
		this.gain = undefined;
		if (this.context) {
			void this.context.close();
			this.context = undefined;
		}
	}
}
