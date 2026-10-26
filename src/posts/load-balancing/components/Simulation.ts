import { html, LitElement, type PropertyValues } from "lit";
import { ThemeController } from "../../../shared/core/controllers/ThemeController";
import { customElement, property, state } from "lit/decorators.js";
import { prefersReducedMotion } from "../../../shared/Accessibility";
import { TimelineController } from "../../../shared/core/controllers/TimelineController";
import { ResizeController } from "../../../shared/core/controllers/ResizeController";
import { VisibilityController } from "../../../shared/core/controllers/VisibilityController";
import {
	simulationSpeed,
	QUEUE_MOTION_DURATION,
	REQUEST_TRAVEL_SPEED,
} from "../globals";
import { calculateDropTrajectory } from "../model/DropTrajectory";
import {
	dynamicWeightedRoundRobinRequestsToSend,
	weightedRoundRobinRequestsToSend,
} from "../model/Algorithms";
import {
	type AlgorithmName,
	type DroppedRequest,
	type RequestArrival,
	type RequestState,
	randomInRange,
	type ServerState,
	SimulationModel,
} from "../model/Simulation";
import { Request } from "./Request";
import type { Select } from "../../../shared/components/Select";
import type { Slider } from "../../../shared/components/Slider";
import { RangeSlider } from "../../../shared/components/RangeSlider";
import type { SpeedSlider } from "../../../shared/components/SpeedSlider";
import { type Point, SimulationScene } from "./SimulationScene";
import { simulationStyles } from "./SimulationStyles";
import { visuallyHiddenStyles } from "../../../shared/styles/Accessibility";
import {
	renderParameterControls,
	renderPlaybackControls,
} from "./SimulationControls";
import {
	algorithmLabels,
	formatValue,
	parseRange,
	parseServerPower,
	ServerLabelMode,
} from "./SimulationSettings";
import "../../../shared/components/Card";
import {
	SlidingGraph,
	type SlidingGraphLine,
} from "../../../shared/components/SlidingGraph";
import { INITIAL_PEAK_EWMA_LATENCY_MS } from "../model/Algorithms";
import {
	graphMarkerPaths,
	graphMarkers,
	type GraphMarker,
} from "../../../shared/GraphMarkers";

const ewmaLineColors = ["blue", "orange", "green", "pink", "dark-blue", "red"];

const QUEUE_TO_SERVER_ANIMATION_ID = "queue-to-server";
const SERVER_CENTER = 25;

@customElement("s-simulation")
export class Simulation extends LitElement {
	static override styles = [simulationStyles, visuallyHiddenStyles];

	@property({ type: Number })
	rps = 5;

	@property({ type: Number, attribute: "rps-variance" })
	rpsVariance = 0;

	@property({ attribute: "rps-range" })
	rpsRange = "";

	@property({ type: Number, attribute: "num-servers" })
	numServers = 2;

	@property({ type: Number, attribute: "queue-max-length" })
	queueMaxLength = 10;

	@property({ type: String, attribute: "server-power" })
	serverPower = "1";

	@property({ type: Number, attribute: "server-power-max" })
	serverPowerMax = 10;

	@property({ type: String, attribute: "request-cost" })
	requestCost = "50";

	@property({ type: Number, attribute: "request-cost-max" })
	requestCostMax = 1000;

	@property({ type: String })
	algorithm: AlgorithmName = "round-robin";

	@property({ type: Boolean, attribute: "show-controls" })
	showControls = false;

	@property({ type: Boolean, attribute: "show-ewma-graph" })
	showEwmaGraph = false;

	private graphLines: readonly SlidingGraphLine[] = [];

	@state()
	private withQueuedRequests = false;

	@property({ type: Boolean, attribute: "hide-reset" })
	hideReset = false;

	@property({ type: Boolean, attribute: "show-shuffle" })
	showShuffle = false;

	@property({ type: String, attribute: "server-labels" })
	serverLabels: ServerLabelMode = ServerLabelMode.None;

	@property({ type: Boolean, attribute: "full-width" })
	fullWidth = false;

	@property({ type: String })
	description!: string;

	private model: SimulationModel | null = null;

	private readonly visibility = new VisibilityController(this, {
		rootMargin: "0px",
	});

	readonly timeline = new TimelineController(this, this.visibility);

	private arrivalTimer: number | null = null;

	private readonly requestTimers = new Map<number, number>();

	private disconnected = false;

	private connectionId = 0;

	private readonly scene = new SimulationScene();

	private creatingModel = false;

	constructor() {
		super();
		new ThemeController(this);
		const resize = new ResizeController(this);
		resize.addEventListener("resize", () => this.handleResize());
		this.visibility.addEventListener("first-visible", () => {
			void this.initialize();
		});
	}

	@state()
	private isPaused = true;

	protected override render() {
		const model = this.model;
		const servers = model?.servers ?? [];
		const queueMaxLength = Math.max(0, Math.round(this.queueMaxLength));
		return html`
			<s-card
				?full-width=${this.fullWidth}
				role="group"
				aria-labelledby="simulation-description"
				aria-describedby="simulation-settings simulation-state"
			>
				<span
					id="simulation-description"
					class="visually-hidden"
					>${this.description}</span
				>
				<span
					id="simulation-settings"
					class="visually-hidden"
					>${this.configurationDescription()}</span
				>
				<span
					id="simulation-state"
					class="visually-hidden"
					>Simulation has not started.</span
				>
				<div
					class=${this.showEwmaGraph ? "simulation with-graph" : "simulation"}
				>
					<div
						class="stage"
						role="img"
						aria-labelledby="simulation-description"
						style=${`--queue-max-length: ${queueMaxLength}; --server-grid-offset: ${queueMaxLength > 0 ? 0 : 8}px`}
					>
						<div
							class="server-grid"
							aria-hidden="true"
							style=${`--num-servers: ${Math.max(1, servers.length)}`}
						>
							${servers.map((server, index) => this.renderServer(server, index))}
						</div>
						<div class="load-balancer"></div>
						<div
							class="request-layer"
							aria-hidden="true"
						></div>
					</div>
					${
						this.showEwmaGraph
							? html`<label class="graph-queue-toggle"
									><input
										type="checkbox"
										.checked=${this.withQueuedRequests}
										@change=${this.handleGraphQueueChange}
									/>
									<span>With <code>queued_requests</code></span></label
								>`
							: undefined
					}
				</div>
				${
					this.showEwmaGraph
						? html`<s-sliding-graph
								class="ewma-graph"
								.timeline=${this.timeline}
								.lines=${this.graphLines}
								.yMax=${1500}
								auto-range
								.windowMs=${20_000}
								label=${`${this.withQueuedRequests ? "PEWMA routing scores" : "EWMA latency estimates"} over time, one line per server from left to right`}
							></s-sliding-graph>`
						: undefined
				}
				<div
					slot="footer"
					class="footer"
				>
					${renderPlaybackControls(
						this.isPaused,
						this.showShuffle,
						this.hideReset,
						{
							reset: () => {
								void this.handleReset().catch(console.error);
							},
							shuffle: this.handleShuffle,
							speed: this.handleSpeedChange,
							toggle: this.togglePlayback,
						},
					)}
					${this.showControls ? renderParameterControls(this, { algorithm: this.handleAlgorithmChange, rps: this.handleRpsChange, requestCost: this.handleRequestCostChange, serverPower: this.handleServerPowerChange, numServers: this.handleNumServersChange }) : undefined}
				</div>
			</s-card>
		`;
	}

	protected override willUpdate(changed: PropertyValues<this>): void {
		if (!this.model) {
			return;
		}

		if (changed.has("algorithm")) {
			this.model.setAlgorithm(this.algorithm);
		}
		if (changed.has("numServers")) {
			this.removeRequestElements(this.model.setNumServers(this.numServers));
			this.configureGraph();
		}
		if (changed.has("queueMaxLength")) {
			this.model.setQueueMaxLength(this.queueMaxLength);
		}
		if (changed.has("rps") || changed.has("rpsVariance")) {
			this.model.setArrivalRate(this.rps, this.rpsVariance);
		}
		if (changed.has("serverPower")) {
			this.model.setServerPower(parseServerPower(this.serverPower));
		}
		if (changed.has("serverPowerMax")) {
			this.model.options.serverPowerMax = Math.max(1, this.serverPowerMax);
		}
		if (changed.has("requestCost")) {
			this.model.options.requestCost = parseRange(this.requestCost, {
				min: 50,
				max: 50,
			});
		}
	}

	override connectedCallback(): void {
		this.connectionId += 1;
		this.disconnected = false;
		this.creatingModel = false;
		if (this.isPaused) {
			this.timeline.pause();
		} else {
			this.timeline.resume();
		}
		super.connectedCallback();
		simulationSpeed.addEventListener("change", this.handleGlobalSpeedChange);
		this.handleGlobalSpeedChange();
	}

	protected override firstUpdated(): void {
		this.scene.index(this.renderRoot);
	}

	protected override updated(changed: PropertyValues<this>): void {
		if (
			!this.scene.isIndexed ||
			changed.has("algorithm") ||
			changed.has("serverLabels") ||
			changed.has("numServers") ||
			changed.has("queueMaxLength")
		) {
			this.scene.index(this.renderRoot);
		}
		if (!this.model) {
			return;
		}
		if (changed.has("numServers") || changed.has("queueMaxLength")) {
			this.scene.invalidateGeometry();
		}

		if (changed.has("rps")) {
			if (this.rps <= 0) {
				this.stopSimulation();
			} else if (this.arrivalTimer === null && !this.isPaused) {
				this.startSimulation(false);
			}
		}
		this.syncScene();
	}

	override disconnectedCallback(): void {
		simulationSpeed.removeEventListener("change", this.handleGlobalSpeedChange);
		this.connectionId += 1;
		this.stopSimulation();
		this.clearRequestTimers();
		this.disconnected = true;
		this.creatingModel = false;
		for (const element of [
			...this.scene.requests.values(),
			...this.scene.droppedRequests.values(),
		]) {
			element.remove();
		}
		this.scene.clear();
		this.model = null;
		super.disconnectedCallback();
	}

	private createModel(): SimulationModel {
		this.timeline.setPlaybackRate(simulationSpeed.get());
		const model = new SimulationModel(
			{
				algorithm: this.algorithm,
				numServers: Math.max(1, Math.round(this.numServers)),
				queueMaxLength: Math.max(0, Math.round(this.queueMaxLength)),
				rps: Math.max(0, this.rps),
				rpsVariance: Math.max(0, Math.min(1, this.rpsVariance)),
				requestCost: parseRange(this.requestCost, { min: 50, max: 50 }),
				serverPower: parseServerPower(this.serverPower),
				serverPowerMax: Math.max(1, this.serverPowerMax),
			},
			Math.random,
			() => this.timeline.nowMs(),
		);
		return model;
	}

	private async initialize(): Promise<void> {
		if (this.model || this.creatingModel || this.disconnected) {
			return;
		}

		this.creatingModel = true;
		const connectionId = this.connectionId;
		try {
			this.model = this.createModel();
			this.configureGraph();
			this.requestUpdate();
			await this.updateComplete;
			if (
				this.disconnected ||
				this.connectionId !== connectionId ||
				this.model === null
			) {
				return;
			}

			this.scene.index(this.renderRoot);
			this.syncScene();
			if (!this.isPaused) {
				this.startSimulation();
			}
		} finally {
			if (this.connectionId === connectionId) {
				this.creatingModel = false;
			}
		}
	}

	private configureGraph(): void {
		const model = this.model;
		if (!this.showEwmaGraph || !model) {
			return;
		}
		this.graphLines = model.servers.map((server, index) => ({
			id: String(server.id),
			label: `Server ${index + 1} ${this.withQueuedRequests ? "PEWMA routing score" : "peak EWMA latency"}`,
			initial: this.graphValue(model, server),
			color: this.ewmaLineColor(index),
			marker: this.ewmaMarker(index),
			markerRadius: 5,
			read: () => this.graphValue(model, server),
		}));
	}

	private graphValue(model: SimulationModel, server: ServerState): number {
		return (
			(this.withQueuedRequests
				? model.peakEwmaScore(server)
				: model.peakEwmaLatencyMs(server)) ?? INITIAL_PEAK_EWMA_LATENCY_MS
		);
	}

	private handleGraphQueueChange = (event: Event): void => {
		if (!(event.currentTarget instanceof HTMLInputElement)) {
			return;
		}
		this.withQueuedRequests = event.currentTarget.checked;
		this.configureGraph();
		const graph =
			this.renderRoot.querySelector<SlidingGraph>("s-sliding-graph");
		if (graph) {
			graph.lines = this.graphLines;
		}
		this.syncScene();
	};

	private ewmaLineColor(index: number): string {
		return `var(--color-palette-${ewmaLineColors[index % ewmaLineColors.length]}-line)`;
	}

	private ewmaMarker(index: number): GraphMarker {
		return graphMarkers[index % graphMarkers.length]!;
	}

	private handleResize(): void {
		if (!this.model) {
			return;
		}
		this.scene.invalidateGeometry();
		this.syncScene();
	}

	private renderServer(server: ServerState, index: number) {
		const shade = this.serverColor(server.power);
		const queueHeight = server.queueMaxLength * 20 - 5;
		return html`
			<div
				class=${`server-slot${this.showEwmaGraph ? " with-ewma" : ""}`}
				data-server-id=${server.id}
				style=${`grid-column: ${index * 2 + 2}; ${this.showEwmaGraph ? `--server-series-color: ${this.ewmaLineColor(index)}` : ""}`}
			>
				${
					server.queueMaxLength > 0
						? html`<s-queue
								class="queue"
								data-server-id=${server.id}
								.capacity=${server.queueMaxLength}
								style=${`--queue-color: ${shade}; height: ${queueHeight}px`}
							>
							</s-queue>`
						: undefined
				}
				<div
					class="server-body"
					data-server-id=${server.id}
					style=${`--server-color: ${shade}; background-color: ${shade}`}
				>
					<div
						class="server-anchor"
						data-server-id=${server.id}
					></div>
					${
						this.showEwmaGraph
							? html`<svg
									class="server-marker"
									viewBox="-1.8 -1.8 3.6 3.6"
									aria-hidden="true"
								>
									<path d=${graphMarkerPaths[this.ewmaMarker(index)]}></path>
								</svg>`
							: undefined
					}
					${
						this.hasServerLabels()
							? html`<span
									class="server-label"
									data-server-id=${server.id}
									aria-hidden="true"
								></span>`
							: undefined
					}
				</div>
			</div>
		`;
	}

	private hasServerLabels(): boolean {
		const mode = this.activeServerLabelMode();
		return (
			(mode === ServerLabelMode.Latency &&
				this.algorithm === "dynamic-weighted-round-robin") ||
			(mode === ServerLabelMode.Requests &&
				(this.algorithm === "weighted-round-robin" ||
					this.algorithm === "dynamic-weighted-round-robin")) ||
			(mode === ServerLabelMode.Pewma &&
				this.algorithm === "peak-exponentially-weighted-moving-average")
		);
	}

	private activeServerLabelMode(): ServerLabelMode {
		if (this.serverLabels !== ServerLabelMode.Auto) {
			return this.serverLabels;
		}
		if (this.algorithm === "peak-exponentially-weighted-moving-average") {
			return ServerLabelMode.Pewma;
		}
		if (
			this.algorithm === "weighted-round-robin" ||
			this.algorithm === "dynamic-weighted-round-robin"
		) {
			return ServerLabelMode.Requests;
		}
		return ServerLabelMode.None;
	}

	private serverColor(power: number): string {
		const progress = Math.min(
			1,
			Math.max(0, (power - 1) / Math.max(1, this.serverPowerMax - 1)),
		);
		const highPowerPercent = Math.round(progress * 100);
		return `color-mix(in srgb, var(--server-high-color) ${highPowerPercent}%, var(--server-low-color) ${100 - highPowerPercent}%)`;
	}

	private configurationDescription(): string {
		const requestCost = parseRange(this.requestCost, { min: 50, max: 50 });
		const requestCostDescription =
			requestCost.min === requestCost.max
				? formatValue(requestCost.min)
				: `${formatValue(requestCost.min)} to ${formatValue(requestCost.max)}`;
		const serverPowerDescription = this.serverPower.replaceAll(":", " to ");
		const queueDescription =
			this.queueMaxLength === 0
				? "no request queue"
				: `${this.queueMaxLength} queue slots per server`;
		return `Current configuration: ${algorithmLabels[this.algorithm]}; ${this.numServers} servers; ${this.rpsRange ? this.rpsRange.replaceAll(":", " to ") : formatValue(this.rps)} requests per second; server power ${serverPowerDescription}; request cost ${requestCostDescription}; ${queueDescription}.`;
	}

	private startSimulation(immediate = true): void {
		if (
			this.arrivalTimer !== null ||
			!this.model ||
			this.model.options.rps <= 0
		) {
			return;
		}
		if (immediate) {
			this.handleArrival();
		} else {
			this.scheduleNextArrival();
		}
	}

	private stopSimulation(): void {
		if (this.arrivalTimer !== null) {
			this.timeline.clearTimeout(this.arrivalTimer);
			this.arrivalTimer = null;
		}
	}

	private scheduleNextArrival(delay?: number): void {
		const model = this.model;
		if (!model || model.options.rps <= 0) {
			return;
		}

		const variance = Math.min(1, Math.max(0, model.options.rpsVariance));
		const multiplier = randomInRange(
			{ min: 1 - variance, max: 1 + variance },
			model.random,
		);
		const rate = this.rpsRange
			? randomInRange(
					parseRange(this.rpsRange, { min: this.rps, max: this.rps }),
					model.random,
				)
			: model.options.rps;
		const interval = delay ?? (1000 / rate) * (this.rpsRange ? 1 : multiplier);
		this.arrivalTimer = this.timeline.setTimeout(() => {
			this.arrivalTimer = null;
			this.handleArrival();
		}, interval);
	}

	private readonly handleArrival = (): void => {
		if (!this.model || this.model.options.rps <= 0) {
			return;
		}

		void this.startRequestTravel(this.model.createRequest()).catch(
			console.error,
		);
		this.scheduleNextArrival();
	};

	private updateLatencyBadgeColour(
		label: HTMLElement,
		latency: number | null,
		minimumLatency: number | null,
		maximumLatency: number | null,
	): void {
		if (
			latency === null ||
			minimumLatency === null ||
			maximumLatency === null ||
			minimumLatency === maximumLatency
		) {
			label.style.removeProperty("--server-badge-colour");
			return;
		}

		const progress = Math.min(
			1,
			Math.max(
				0,
				(latency - minimumLatency) / (maximumLatency - minimumLatency),
			),
		);
		label.style.setProperty(
			"--server-badge-colour",
			`color-mix(in oklch, var(--color-data-fill-red) ${Math.round(progress * 100)}%, var(--color-data-fill-green))`,
		);
	}

	private syncScene(): void {
		const model = this.model;
		if (!model) {
			return;
		}

		if (!this.scene.isIndexed) {
			return;
		}

		const queuedRequests = model.servers.reduce(
			(total, server) => total + server.queue.length,
			0,
		);
		const labelMode = this.activeServerLabelMode();
		const requestCounts =
			labelMode === ServerLabelMode.Requests && this.hasServerLabels()
				? model.servers.map((server) =>
						this.algorithm === "weighted-round-robin"
							? weightedRoundRobinRequestsToSend(server, model.servers)
							: dynamicWeightedRoundRobinRequestsToSend(server, model.servers),
					)
				: [];
		const countSummary =
			requestCounts.length > 0
				? ` Requests per turn for each server: ${requestCounts.join(", ")}.`
				: "";
		const latencySummary =
			labelMode === ServerLabelMode.Latency && this.hasServerLabels()
				? ` Average latency for each server: ${model.servers
						.map((server) =>
							server.averageLatency === null
								? "no samples"
								: `${(server.averageLatency / 1000).toFixed(1)} seconds`,
						)
						.join(", ")}.`
				: "";
		const pewmaSummary =
			labelMode === ServerLabelMode.Pewma && this.hasServerLabels()
				? ` PEWMA latency estimate for each server: ${model.servers
						.map((server) => {
							const latency = model.peakEwmaLatencyMs(server);
							return latency === null
								? "no samples"
								: `${(latency / 1000).toFixed(1)} seconds`;
						})
						.join(", ")}.`
				: "";
		this.scene.setStateSummary(
			`Current state: ${model.completedRequests} completed; ${model.droppedCount} dropped; ${model.requests.length} active, including ${queuedRequests} queued.${countSummary}${latencySummary}${pewmaSummary}`,
		);

		const badgeLatencies = model.servers.map((server) =>
			labelMode === ServerLabelMode.Pewma
				? model.peakEwmaLatencyMs(server)
				: server.averageLatency,
		);
		const latencies = badgeLatencies.flatMap((latency) =>
			latency === null ? [] : [latency],
		);
		const minimumLatency = latencies.length > 0 ? Math.min(...latencies) : null;
		const maximumLatency = latencies.length > 0 ? Math.max(...latencies) : null;
		const graph =
			this.renderRoot.querySelector<SlidingGraph>("s-sliding-graph");
		if (graph) {
			const values = model.servers.map((server) =>
				this.graphValue(model, server),
			);
			const description = this.withQueuedRequests
				? "PEWMA routing scores over time: (outstanding requests + 1) × peak EWMA latency. Lower scores are preferred."
				: "EWMA latency estimates over time in milliseconds.";
			graph.label = `${description} Servers from left to right: ${values.map((value, index) => `server ${index + 1}: ${Math.round(value)}${this.withQueuedRequests ? "" : " milliseconds"}`).join("; ")}.`;
		}
		for (const [index, server] of model.servers.entries()) {
			const label = this.scene.serverLabel(server.id);
			if (
				label &&
				(labelMode === ServerLabelMode.Latency ||
					labelMode === ServerLabelMode.Pewma)
			) {
				const latency = badgeLatencies[index] ?? null;
				this.updateLatencyBadgeColour(
					label,
					latency,
					minimumLatency,
					maximumLatency,
				);
				const text = latency === null ? "—" : `${(latency / 1000).toFixed(1)}s`;
				if (label.textContent !== text) {
					label.textContent = text;
				}
			} else if (label && labelMode === ServerLabelMode.Requests) {
				if (this.algorithm === "dynamic-weighted-round-robin") {
					this.updateLatencyBadgeColour(
						label,
						badgeLatencies[index] ?? null,
						minimumLatency,
						maximumLatency,
					);
				} else {
					label.style.removeProperty("--server-badge-colour");
				}
				const text = String(requestCounts[index]);
				if (label.textContent !== text) {
					label.textContent = text;
				}
			}

			const serverAnchor = this.scene.serverAnchor(server.id);
			if (server.current && serverAnchor) {
				this.syncStableRequest(server.current, serverAnchor);
			}
			this.syncQueue(server);
		}

		// Travel requests are adopted by their destination anchor before the
		// animation starts. Never move them back to request-layer here.
		for (const request of model.requests) {
			if (
				request.status === "travelling" &&
				!this.scene.requests.has(request.id)
			) {
				void this.startRequestTravel(request).catch(console.error);
			}
		}

		for (const [requestId, element] of this.scene.requests) {
			if (!model.requests.some((request) => request.id === requestId)) {
				this.cancelRequestAnimations(requestId);
				element.remove();
				this.scene.requests.delete(requestId);
			}
		}
	}

	private syncStableRequest(request: RequestState, anchor: HTMLElement): void {
		const element = this.scene.requests.get(request.id);
		if (!element) {
			return;
		}
		if (element.parentElement !== anchor) {
			anchor.append(element);
		}
		element.status = "processing";
		delete element.dataset.queueIndex;
		element.moveTo(SERVER_CENTER, SERVER_CENTER);
	}

	private syncQueue(
		server: NonNullable<SimulationModel["servers"]>[number],
		animate = false,
	): void {
		const queue = this.scene.queue(server.id);
		if (!queue) {
			return;
		}
		const requests: Request[] = [];
		for (const [queueIndex, request] of server.queue.entries()) {
			const element = this.scene.requests.get(request.id);
			if (!element) {
				continue;
			}
			element.status = "queued";
			element.dataset.queueIndex = String(queueIndex);
			requests.push(element);
		}
		queue.place(requests, animate);
	}

	private async startRequestTravel(request: RequestState): Promise<void> {
		if (this.scene.requests.has(request.id)) {
			return;
		}
		const model = this.model;
		const requestLayer = this.scene.requestLayer;
		const destinationAnchor = this.scene.serverAnchor(request.destination.id);
		if (!model || !requestLayer || !destinationAnchor) {
			return;
		}
		const geometry = this.scene.geometry();
		const destination = geometry?.servers.get(request.destination.id);
		if (!geometry || !destination) {
			return;
		}

		const element = this.createRequestElement(request);
		requestLayer.append(element);
		element.status = "travelling";
		element.moveTo(geometry.loadBalancer.x, geometry.loadBalancer.y);
		await element.updateComplete;
		if (
			this.model !== model ||
			this.scene.requests.get(request.id) !== element ||
			!element.isConnected
		) {
			return;
		}
		// Reparent first, then animate the inverse world-space delta back to the
		// destination anchor's local origin. Parent/grid movement is therefore
		// included automatically in the request's final position.
		destinationAnchor.append(element);
		element.moveTo(SERVER_CENTER, SERVER_CENTER);
		const deltaX = geometry.loadBalancer.x - destination.x;
		const deltaY = geometry.loadBalancer.y - destination.y;
		const distance = Math.hypot(deltaX, deltaY);
		const animation = element.playMotion(
			[{ translate: `${deltaX}px ${deltaY}px` }, { translate: "0px 0px" }],
			{
				duration: Math.max(1, (distance / REQUEST_TRAVEL_SPEED) * 1000),
				easing: "linear",
				fill: "both",
			},
		);
		this.watchRequestAnimation(request, animation, request.createdAt, (at) =>
			this.handleTravelFinished(request, element, at),
		);
	}

	private handleTravelFinished(
		request: RequestState,
		element: Request,
		arrivedAt: number,
	): void {
		const model = this.model;
		if (!model?.requests.includes(request)) {
			return;
		}
		const arrival = model.acceptRequest(request, arrivedAt);
		if (arrival.kind === "dropped") {
			this.startDroppedAnimation(request, element, arrival.dropped);
			this.syncScene();
			return;
		}
		if (arrival.kind === "queued") {
			this.syncQueue(arrival.server, true);
			return;
		}
		this.syncScene();
		this.startProcessing(request, arrival, arrivedAt);
	}

	private startProcessing(
		request: RequestState,
		arrival: Extract<RequestArrival, { kind: "processing" }>,
		startedAt: number,
	): void {
		const model = this.model;
		const element = this.scene.requests.get(request.id);
		if (!model || !element || arrival.server.current !== request) {
			return;
		}

		const reducedMotion = prefersReducedMotion();
		const animation = element.playProcessingWipe(
			model.processingDuration(request, arrival.server),
			reducedMotion,
		);
		if (!animation) {
			return;
		}
		this.watchRequestAnimation(request, animation, startedAt, (completedAt) => {
			const queue = this.scene.queue(arrival.server.id);
			const queuedRequest = arrival.server.queue[0] ?? null;
			const queuedElement = queuedRequest
				? this.scene.requests.get(queuedRequest.id)
				: undefined;
			// `queue[0]` is the FIFO head, rendered in its bottom slot. Use the
			// cached DOM slot position rather than model coordinates so its FLIP
			// transition begins at precisely that bottom visual.
			const queuedPosition = queuedRequest
				? (this.scene.geometry()?.queues.get(arrival.server.id) ?? null)
				: null;
			if (queuedElement) {
				queue?.take(queuedElement);
			}
			const next = model.completeRequest(request, completedAt);
			this.cancelRequestAnimations(request.id);
			this.scene.requests.delete(request.id);
			element.remove();
			this.syncQueue(arrival.server, true);
			if (next) {
				this.moveQueuedRequestToServer(next, queuedPosition, completedAt);
			}
			this.syncScene();
		});
	}

	private moveQueuedRequestToServer(
		request: RequestState,
		queuedPosition: Point | null,
		startedAt: number,
	): void {
		const element = this.scene.requests.get(request.id);
		const anchor = this.scene.serverAnchor(request.destination.id);
		if (!element || !anchor) {
			return;
		}

		anchor.append(element);
		element.status = "processing";
		delete element.dataset.queueIndex;
		element.moveTo(SERVER_CENTER, SERVER_CENTER);
		const destination = this.scene
			.geometry()
			?.servers.get(request.destination.id);
		if (!destination) {
			return;
		}
		const animation = element.playMotion(
			[
				{
					translate: `${(queuedPosition?.x ?? destination.x) - destination.x}px ${(queuedPosition?.y ?? destination.y) - destination.y}px`,
				},
				{ translate: "0px 0px" },
			],
			{
				duration: prefersReducedMotion() ? 0 : QUEUE_MOTION_DURATION,
				easing: "cubic-bezier(0.22, 1, 0.36, 1)",
				fill: "both",
			},
			QUEUE_TO_SERVER_ANIMATION_ID,
		);
		// The server owns the request while it moves out of the queue, but the
		// wipe must not start until the request is visible at the server's centre.
		// Fast requests could otherwise finish processing during this FLIP move,
		// making them appear to vanish without a wipe.
		this.watchRequestAnimation(request, animation, startedAt, (at) => {
			this.startProcessing(
				request,
				{ kind: "processing", server: request.destination },
				at,
			);
		});
	}

	private startDroppedAnimation(
		request: RequestState,
		element: Request,
		dropped: DroppedRequest,
	): void {
		const model = this.model;
		const requestLayer = this.scene.requestLayer;
		if (!model || !requestLayer) {
			return;
		}
		const geometry = this.scene.geometry();
		const start = geometry?.servers.get(request.destination.id);
		if (!geometry || !start) {
			return;
		}

		this.cancelRequestAnimations(request.id);
		this.scene.requests.delete(request.id);
		this.scene.droppedRequests.set(dropped.id, element);
		element.setDropped();
		requestLayer.append(element);
		element.moveTo(start.x, start.y);

		const radius = 10;
		const trajectory = calculateDropTrajectory(dropped.fallAngle, {
			left: -start.x - radius,
			right: geometry.width - start.x + radius,
			top: -start.y - radius,
			bottom: geometry.height - start.y + radius,
		});
		const keyframes: Keyframe[] = trajectory.samples.map(
			({ elapsedMs, x, y }) => ({
				translate: `${x}px ${y}px`,
				offset: elapsedMs / trajectory.durationMs,
			}),
		);
		const animation = element.playMotion(keyframes, {
			duration: trajectory.durationMs,
			easing: "linear",
			fill: "both",
		});
		this.watchAnimation(animation, () => {
			this.scene.droppedRequests.delete(dropped.id);
			model.removeDroppedRequest(dropped.id);
			element.remove();
		});
	}

	private createRequestElement(request: RequestState): Request {
		const element = new Request();
		element.timeline = this.timeline;
		element.dataset.requestId = String(request.id);
		element.setAttribute("aria-hidden", "true");
		this.scene.requests.set(request.id, element);
		return element;
	}

	private readonly handleGlobalSpeedChange = (): void => {
		this.timeline.setPlaybackRate(simulationSpeed.get());
		this.requestUpdate();
	};

	private removeRequestElements(requestIds: number[]): void {
		for (const requestId of requestIds) {
			this.cancelRequestAnimations(requestId);
			this.scene.requests.get(requestId)?.remove();
			this.scene.requests.delete(requestId);
		}
	}

	private watchRequestAnimation(
		request: RequestState,
		animation: Animation,
		startedAt: number,
		onFinished: (at: number) => void,
	): void {
		// Frame delivery must not inflate measured latency at higher playback rates.
		const finishedAt =
			startedAt + Number(animation.effect!.getComputedTiming().endTime);
		const timer = this.timeline.setTimeout(
			() => {
				this.requestTimers.delete(request.id);
				animation.cancel();
				if (!this.disconnected && this.model?.requests.includes(request)) {
					onFinished(finishedAt);
				}
			},
			Math.max(0, finishedAt - this.timeline.nowMs()),
		);
		this.requestTimers.set(request.id, timer);
	}

	private clearRequestTimers(): void {
		for (const timer of this.requestTimers.values()) {
			this.timeline.clearTimeout(timer);
		}
		this.requestTimers.clear();
	}

	private watchAnimation(animation: Animation, onFinished: () => void): void {
		void animation.finished.then(
			() => {
				animation.cancel();
				if (!this.disconnected) {
					onFinished();
				}
			},
			() => {},
		);
	}

	private cancelRequestAnimations(id: number): void {
		const timer = this.requestTimers.get(id);
		if (timer !== undefined) {
			this.timeline.clearTimeout(timer);
			this.requestTimers.delete(id);
		}
		const element =
			this.scene.requests.get(id) ?? this.scene.droppedRequests.get(id);
		if (!element) {
			return;
		}
		element.cancelAnimations();
	}

	private readonly togglePlayback = (): void => {
		this.isPaused = !this.isPaused;
		if (this.isPaused) {
			this.timeline.pause();
		} else {
			this.timeline.resume();
		}
		if (!this.isPaused) {
			this.syncScene();
			this.startSimulation();
		}
	};

	private readonly handleSpeedChange = (event: Event): void => {
		// SAFETY: renderPlaybackControls binds this handler to its speed slider.
		const control = event.currentTarget as SpeedSlider;
		simulationSpeed.set(Math.max(0.01, Number(control.value)));
	};

	private readonly handleReset = async (): Promise<void> => {
		this.stopSimulation();
		this.clearRequestTimers();
		for (const element of [
			...this.scene.requests.values(),
			...this.scene.droppedRequests.values(),
		]) {
			element.cancelAnimations();
			element.remove();
		}
		this.scene.requests.clear();
		this.scene.droppedRequests.clear();
		this.model = this.createModel();
		this.configureGraph();
		this.requestUpdate();
		await this.updateComplete;
		const graph =
			this.renderRoot.querySelector<SlidingGraph>("s-sliding-graph");
		if (graph) {
			await graph.updateComplete;
			graph.reset();
		}
		this.syncScene();
		if (!this.isPaused) {
			this.startSimulation();
		}
	};

	private readonly handleShuffle = (): void => {
		if (!this.model) {
			return;
		}
		this.model.setServerPower(parseServerPower(this.serverPower));
		this.renderRoot
			.querySelector<SlidingGraph>("s-sliding-graph")
			?.addTimeMarker("var(--color-palette-red-line)");
		this.requestUpdate();
	};

	private handleAlgorithmChange = (event: Event): void => {
		// SAFETY: renderParameterControls binds this handler to its s-select.
		const select = event.currentTarget as Select;
		// SAFETY: this select's options are generated from the AlgorithmName-keyed algorithmLabels.
		this.algorithm = select.value as AlgorithmName;
	};

	private handleRpsChange = (event: Event): void => {
		if (!(event.currentTarget instanceof RangeSlider)) {
			return;
		}
		const [minimum, maximum] = event.currentTarget.value;
		this.rpsRange = `${minimum}:${maximum}`;
		this.rps = (minimum + maximum) / 2;
	};

	private handleRequestCostChange = (event: Event): void => {
		if (!(event.currentTarget instanceof RangeSlider)) {
			return;
		}
		this.requestCost = event.currentTarget.value.join(":");
	};

	private handleServerPowerChange = (event: Event): void => {
		if (!(event.currentTarget instanceof RangeSlider)) {
			return;
		}
		this.serverPower = event.currentTarget.value.join(":");
	};

	private handleNumServersChange = (event: Event): void => {
		this.numServers = Number(this.controlValue(event));
	};

	private controlValue(event: Event): string {
		// SAFETY: every caller handles a slider event from the simulation's control templates.
		return (event.currentTarget as Slider).value;
	}
}
