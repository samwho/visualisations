import type {
	AlgorithmName,
	Random,
	RequestFinishedEvent,
	RequestState,
	ServerState,
} from "./Simulation";

export interface LoadBalancingAlgorithm {
	select(request: RequestState, servers: ServerState[]): ServerState;
	initialize?(requests: RequestState[]): void;
	onRequestFinished?(event: RequestFinishedEvent): void;
	peakEwmaLatencyMs?(server: ServerState): number | null;
	peakEwmaScore?(server: ServerState): number;
}

export const INITIAL_PEAK_EWMA_LATENCY_MS = 1000;
export const PEAK_EWMA_SMOOTHING = 0.2;

class RoundRobin implements LoadBalancingAlgorithm {
	private currentServer = 0;

	select(_request: RequestState, servers: ServerState[]): ServerState {
		const server = servers[this.currentServer % servers.length]!;
		this.currentServer = (this.currentServer + 1) % servers.length;
		return server;
	}
}

class WeightedRandom implements LoadBalancingAlgorithm {
	constructor(private readonly random: Random) {}

	select(_request: RequestState, servers: ServerState[]): ServerState {
		const totalPower = servers.reduce((sum, server) => sum + server.power, 0);
		let target = this.random() * totalPower;
		for (const server of servers) {
			target -= server.power;
			if (target <= 0) {
				return server;
			}
		}
		return servers.at(-1)!;
	}
}

class WeightedRoundRobin implements LoadBalancingAlgorithm {
	private currentServer = 0;

	private requestsSentToCurrentServer = 0;

	select(_request: RequestState, servers: ServerState[]): ServerState {
		let server = servers[this.currentServer % servers.length]!;
		const requestsToSend = weightedRoundRobinRequestsToSend(server, servers);

		if (this.requestsSentToCurrentServer >= requestsToSend) {
			this.currentServer = (this.currentServer + 1) % servers.length;
			this.requestsSentToCurrentServer = 0;
			server = servers[this.currentServer]!;
		}

		this.requestsSentToCurrentServer += 1;
		return server;
	}
}

export function weightedRoundRobinRequestsToSend(
	server: ServerState,
	servers: ServerState[],
): number {
	const minimumPower = Math.min(...servers.map((candidate) => candidate.power));
	return Math.max(
		1,
		Math.ceil(server.power / Math.max(minimumPower, Number.EPSILON)),
	);
}

class DynamicWeightedRoundRobin implements LoadBalancingAlgorithm {
	private currentServer = 0;

	private requestsSentToCurrentServer = 0;

	select(_request: RequestState, servers: ServerState[]): ServerState {
		let server = servers[this.currentServer % servers.length]!;
		const requestsToSend = dynamicWeightedRoundRobinRequestsToSend(
			server,
			servers,
		);

		if (this.requestsSentToCurrentServer >= requestsToSend) {
			this.currentServer = (this.currentServer + 1) % servers.length;
			this.requestsSentToCurrentServer = 0;
			server = servers[this.currentServer]!;
		}

		this.requestsSentToCurrentServer += 1;
		return server;
	}
}

export function dynamicWeightedRoundRobinRequestsToSend(
	server: ServerState,
	servers: ServerState[],
): number {
	const latency = server.averageLatency;
	if (latency === null) {
		return 1;
	}
	let minimumLatency = 999_999;
	let maximumLatency = 0;
	for (const candidate of servers) {
		minimumLatency = Math.min(
			minimumLatency,
			candidate.averageLatency ?? 99_999_999,
		);
		maximumLatency = Math.max(maximumLatency, candidate.averageLatency ?? 0);
	}
	return Math.max(
		1,
		3 - Math.ceil(((latency - minimumLatency) / maximumLatency) * 3),
	);
}

class LeastConnections implements LoadBalancingAlgorithm {
	private readonly connections = new Map<number, number>();

	private readonly random: Random;

	constructor(random: Random) {
		this.random = random;
	}

	initialize(requests: RequestState[]): void {
		this.connections.clear();
		for (const request of requests) {
			const serverId = request.destination.id;
			this.connections.set(serverId, (this.connections.get(serverId) ?? 0) + 1);
		}
	}

	select(_request: RequestState, servers: ServerState[]): ServerState {
		const lowest = Math.min(
			...servers.map((server) => this.connections.get(server.id) ?? 0),
		);
		const candidates = servers.filter(
			(server) => (this.connections.get(server.id) ?? 0) === lowest,
		);
		const server = candidates[Math.floor(this.random() * candidates.length)]!;
		this.connections.set(server.id, (this.connections.get(server.id) ?? 0) + 1);
		return server;
	}

	onRequestFinished(event: RequestFinishedEvent): void {
		const connections = this.connections.get(event.request.destination.id) ?? 0;
		this.connections.set(
			event.request.destination.id,
			Math.max(0, connections - 1),
		);
	}
}

export class PeakEwma {
	private value: number;

	private sampled = false;

	constructor(
		private readonly alpha: number,
		initialValue = INITIAL_PEAK_EWMA_LATENCY_MS,
	) {
		this.value = initialValue;
	}

	update(sample: number): void {
		const previous = this.value;
		this.value = this.alpha * sample + (1 - this.alpha) * previous;
		if (sample > previous) {
			this.value *= 1 + (this.alpha / 4) * (this.value / previous);
		}
		this.sampled = true;
	}

	get peak(): number {
		return this.value;
	}

	get hasSample(): boolean {
		return this.sampled;
	}
}

class PeakExponentiallyWeightedMovingAverage implements LoadBalancingAlgorithm {
	private readonly connections = new Map<number, number>();

	private readonly peaks = new WeakMap<ServerState, PeakEwma>();

	private readonly smoothing = PEAK_EWMA_SMOOTHING;

	initialize(requests: RequestState[]): void {
		this.connections.clear();
		for (const request of requests) {
			const serverId = request.destination.id;
			this.connections.set(serverId, (this.connections.get(serverId) ?? 0) + 1);
		}
	}

	select(_request: RequestState, servers: ServerState[]): ServerState {
		for (const server of servers) {
			if (!this.peaks.has(server)) {
				this.peaks.set(server, new PeakEwma(this.smoothing));
			}
		}

		let chosen = servers[0]!;
		for (const server of servers.slice(1)) {
			const chosenScore = this.peakEwmaScore(chosen);
			const serverScore = this.peakEwmaScore(server);
			if (serverScore < chosenScore) {
				chosen = server;
			}
		}

		this.connections.set(chosen.id, (this.connections.get(chosen.id) ?? 0) + 1);
		return chosen;
	}

	peakEwmaScore(server: ServerState): number {
		return (
			((this.connections.get(server.id) ?? 0) + 1) *
			(this.peakEwmaLatencyMs(server) ?? INITIAL_PEAK_EWMA_LATENCY_MS)
		);
	}

	peakEwmaLatencyMs(server: ServerState): number | null {
		const peak = this.peaks.get(server);
		return peak?.hasSample ? peak.peak : null;
	}

	onRequestFinished(event: RequestFinishedEvent): void {
		const server = event.request.destination;
		const serverId = server.id;
		const connections = this.connections.get(serverId) ?? 0;
		this.connections.set(serverId, Math.max(0, connections - 1));
		const peak = this.peaks.get(server) ?? new PeakEwma(this.smoothing);
		this.peaks.set(server, peak);
		peak.update(event.dropped ? 5000 : event.latencyMs);
	}
}

class RandomAlgorithm implements LoadBalancingAlgorithm {
	constructor(private readonly random: Random) {}

	select(_request: RequestState, servers: ServerState[]): ServerState {
		return servers[Math.floor(this.random() * servers.length)]!;
	}
}

export function createAlgorithm(
	name: AlgorithmName,
	random: Random,
): LoadBalancingAlgorithm {
	switch (name) {
		case "weighted-random":
			return new WeightedRandom(random);
		case "weighted-round-robin":
			return new WeightedRoundRobin();
		case "dynamic-weighted-round-robin":
			return new DynamicWeightedRoundRobin();
		case "least-connections":
			return new LeastConnections(random);
		case "peak-exponentially-weighted-moving-average":
			return new PeakExponentiallyWeightedMovingAverage();
		case "random":
			return new RandomAlgorithm(random);
		case "round-robin":
			return new RoundRobin();
	}
}
