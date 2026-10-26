import type { Hasher } from "../model/Hashers";
import type { InputSource } from "../model/HeatMapModel";

export interface HashSource {
	id: number;
	code: string;
}

export interface HeatMapConfig {
	inputs: InputSource;
	hashFn: Hasher;
	// Source text is sent once per editor revision, not on every slider input.
	source?: { id: number; code?: string };
	seed: number;
	columns: number;
	rows: number;
	iterations: number;
	progress: number;
	color: string;
	seedCacheLimit: number;
}

export type HeatMapCommand =
	| { type: "init"; canvas: OffscreenCanvas }
	| { type: "render"; generation: number; config: HeatMapConfig }
	| { type: "visibility"; visible: boolean }
	| { type: "remove" };

export type HeatMapRequest = HeatMapCommand & { id: number };

export type HeatMapStatus =
	| { type: "accepted"; generation: number }
	| { type: "compiled"; sourceId: number }
	| { type: "frame"; generation: number; complete: boolean }
	| { type: "error"; generation: number; sourceId?: number; message: string };

export type HeatMapReply = HeatMapStatus & { id: number };
