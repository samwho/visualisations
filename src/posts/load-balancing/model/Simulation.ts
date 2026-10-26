import { createAlgorithm, type LoadBalancingAlgorithm } from "./Algorithms";

export type AlgorithmName =
	| "round-robin"
	| "weighted-random"
	| "weighted-round-robin"
	| "dynamic-weighted-round-robin"
	| "least-connections"
	| "peak-exponentially-weighted-moving-average"
	| "random";

export interface NumberRange {
	min: number;
	max: number;
}

export type ServerPower = NumberRange | number[];

export interface SimulationOptions {
	algorithm: AlgorithmName;
	numServers: number;
	queueMaxLength: number;
	rps: number;
	rpsVariance: number;
	requestCost: NumberRange;
	serverPower: ServerPower;
	serverPowerMax: number;
}

export type RequestStatus = "travelling" | "processing" | "queued";

export type RequestArrival =
	| { kind: "processing"; server: ServerState }
	| { kind: "queued"; server: ServerState }
	| { kind: "dropped"; dropped: DroppedRequest };

export interface RequestState {
	readonly id: number;
	destination: ServerState;
	readonly createdAt: number;
	age: number;
	readonly cost: number;
	status: RequestStatus;
}

export interface DroppedRequest {
	readonly id: number;
	readonly fallAngle: number;
}

export interface RequestFinishedEvent {
	request: RequestState;
	dropped: boolean;
	latencyMs: number;
}

export type Random = () => number;

export class ServerState {
	readonly id: number;

	powerRange: NumberRange;

	queueMaxLength: number;

	power: number;

	current: RequestState | null = null;

	queue: RequestState[] = [];

	latencySamples: number[] = [];

	constructor(
		id: number,
		powerRange: NumberRange,
		queueMaxLength: number,
		random: Random,
	) {
		this.id = id;
		this.powerRange = powerRange;
		this.queueMaxLength = queueMaxLength;
		this.power = randomInRange(powerRange, random);
	}

	setPower(powerRange: NumberRange, random: Random): void {
		this.powerRange = powerRange;
		this.power = randomInRange(powerRange, random);
	}

	get connectionCount(): number {
		return (this.current ? 1 : 0) + this.queue.length;
	}

	get averageLatency(): number | null {
		if (this.latencySamples.length === 0) {
			return null;
		}
		return average(this.latencySamples);
	}
}

export class SimulationModel {
	readonly requests: RequestState[] = [];

	readonly droppedRequests: DroppedRequest[] = [];

	readonly servers: ServerState[] = [];

	readonly options: SimulationOptions;

	readonly random: Random;

	private readonly now: () => number;

	completedRequests = 0;

	droppedCount = 0;

	private nextRequestId = 1;

	private algorithm: LoadBalancingAlgorithm;

	constructor(
		options: SimulationOptions,
		random: Random = Math.random,
		now: () => number = defaultNow,
	) {
		this.options = options;
		this.random = random;
		this.now = now;
		this.algorithm = createAlgorithm(options.algorithm, random);
		this.createServers();
	}

	setAlgorithm(name: AlgorithmName): void {
		this.options.algorithm = name;
		this.algorithm = createAlgorithm(name, this.random);
		this.algorithm.initialize?.(this.requests);
		for (const server of this.servers) {
			server.latencySamples = [];
		}
	}

	setNumServers(numServers: number): number[] {
		const target = Math.max(1, Math.round(numServers));
		const removedRequestIds: number[] = [];
		if (target > this.servers.length) {
			for (let index = this.servers.length; index < target; index += 1) {
				this.servers.push(
					new ServerState(
						index,
						powerRangeAt(this.options.serverPower, index),
						this.options.queueMaxLength,
						this.random,
					),
				);
			}
		} else if (target < this.servers.length) {
			const removedServers = new Set(this.servers.slice(target));
			for (let index = this.requests.length - 1; index >= 0; index -= 1) {
				const request = this.requests[index]!;
				if (removedServers.has(request.destination)) {
					this.removeRequest(request);
					removedRequestIds.push(request.id);
				}
			}
			this.servers.splice(target);
			this.algorithm.initialize?.(this.requests);
		}
		this.options.numServers = target;
		return removedRequestIds;
	}

	setServerPower(serverPower: ServerPower): void {
		this.options.serverPower = serverPower;
		for (const [index, server] of this.servers.entries()) {
			server.setPower(powerRangeAt(serverPower, index), this.random);
		}
	}

	peakEwmaScore(server: ServerState): number | null {
		return this.algorithm.peakEwmaScore?.(server) ?? null;
	}

	peakEwmaLatencyMs(server: ServerState): number | null {
		return this.algorithm.peakEwmaLatencyMs?.(server) ?? null;
	}

	setQueueMaxLength(queueMaxLength: number): void {
		const length = Math.max(0, Math.round(queueMaxLength));
		this.options.queueMaxLength = length;
		for (const server of this.servers) {
			server.queueMaxLength = length;
		}
	}

	setArrivalRate(rps: number, rpsVariance: number): void {
		this.options.rps = Math.max(0, rps);
		this.options.rpsVariance = Math.min(1, Math.max(0, rpsVariance));
	}

	private createServers(): void {
		this.servers.splice(0);
		for (let index = 0; index < this.options.numServers; index += 1) {
			const powerRange = powerRangeAt(this.options.serverPower, index);
			this.servers.push(
				new ServerState(
					index,
					powerRange,
					this.options.queueMaxLength,
					this.random,
				),
			);
		}
	}

	createRequest(createdAt = this.now()): RequestState {
		const cost = randomInRange(this.options.requestCost, this.random);
		const request: RequestState = {
			id: this.nextRequestId,
			destination: this.servers[0]!,
			createdAt,
			age: 0,
			cost,
			status: "travelling",
		};
		this.nextRequestId += 1;
		request.destination = this.algorithm.select(request, this.servers);
		this.addRequest(request);
		return request;
	}

	acceptRequest(
		request: RequestState,
		acceptedAt = this.now(),
	): RequestArrival {
		request.age = this.requestAge(request, acceptedAt);
		const server = request.destination;
		if (server.current === null) {
			server.current = request;
			request.status = "processing";
			return { kind: "processing", server };
		}
		if (server.queue.length < server.queueMaxLength) {
			request.status = "queued";
			server.queue.push(request);
			return { kind: "queued", server };
		}
		const dropped = this.dropRequest(request, acceptedAt);
		return { kind: "dropped", dropped };
	}

	processingDuration(
		request: RequestState,
		server = request.destination,
	): number {
		return Math.max(
			1,
			(request.cost / Math.max(server.power, Number.EPSILON)) * (1000 / 60),
		);
	}

	completeRequest(
		request: RequestState,
		completedAt = this.now(),
	): RequestState | null {
		const server = request.destination;
		request.age = this.requestAge(request, completedAt);
		const processingMs = this.processingDuration(request, server);
		server.current = null;
		server.latencySamples.push(processingMs);
		if (server.latencySamples.length > 3) {
			server.latencySamples.shift();
		}
		this.removeRequest(request);
		this.completedRequests += 1;
		this.algorithm.onRequestFinished?.({
			request,
			dropped: false,
			latencyMs: request.age,
		});

		const next = server.queue.shift() ?? null;
		if (next) {
			server.current = next;
			next.status = "processing";
			next.age = this.requestAge(next, completedAt);
		}
		return next;
	}

	removeDroppedRequest(id: number): void {
		const index = this.droppedRequests.findIndex(
			(request) => request.id === id,
		);
		this.droppedRequests.splice(index, 1);
	}

	requestAge(request: RequestState, at = this.now()): number {
		return Math.max(0, at - request.createdAt);
	}

	private addRequest(request: RequestState): void {
		this.requests.push(request);
	}

	private removeRequest(request: RequestState): void {
		const index = this.requests.indexOf(request);
		this.requests.splice(index, 1);
	}

	private dropRequest(
		request: RequestState,
		droppedAt: number,
	): DroppedRequest {
		this.removeRequest(request);
		request.age = this.requestAge(request, droppedAt);
		this.droppedCount += 1;
		const droppedRequest = {
			id: request.id,
			fallAngle:
				(randomInRange({ min: -10, max: 10 }, this.random) * Math.PI) / 180,
		} satisfies DroppedRequest;
		this.droppedRequests.push(droppedRequest);
		this.algorithm.onRequestFinished?.({
			request,
			dropped: true,
			latencyMs: request.age,
		});
		return droppedRequest;
	}
}

function defaultNow(): number {
	return typeof performance === "undefined" ? Date.now() : performance.now();
}

export function average(values: number[]): number {
	return values.length === 0
		? 0
		: values.reduce((total, value) => total + value, 0) / values.length;
}

export function randomInRange(range: NumberRange, random: Random): number {
	if (range.min === range.max) {
		return range.min;
	}
	return random() * (range.max - range.min) + range.min;
}

export function powerRangeAt(power: ServerPower, index: number): NumberRange {
	if (Array.isArray(power)) {
		const value = power[index] ?? power.at(-1) ?? 1;
		return { min: value, max: value };
	}
	return power;
}

export function seededRandom(seed: number): Random {
	let state = seed >>> 0;
	return () => {
		state += 0x6d2b79f5;
		let value = state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
}
