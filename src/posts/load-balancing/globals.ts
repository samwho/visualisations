import { ObservedState } from "../../shared/core/ObservedState";

export const DEFAULT_SIMULATION_SPEED = 1;
export const REQUEST_TRAVEL_SPEED = 10 * 60;
// Sample the parabolic fall often enough that each straight WAAPI segment is
// visually smooth, while keeping trajectory creation bounded for dropped work.
export const DROP_SAMPLE_INTERVAL = 50;
export const DROP_GRAVITY = REQUEST_TRAVEL_SPEED * 4;
export const DROP_MAX_DURATION = 10_000;
export const REQUEST_COLOUR_UPDATE_INTERVAL = 250;
export const REQUEST_ENTRY_DURATION = 180;
export const QUEUE_MOTION_DURATION = 160;

// Lower values make every load-balancing simulation slower. Keep this as the
// only per-post speed adjustment; 1 is normal speed.
export const simulationSpeed = new ObservedState(DEFAULT_SIMULATION_SPEED);
