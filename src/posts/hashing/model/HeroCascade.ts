export const HERO_BITS = 32;
export const HERO_INPUT = 0x6a09e667;
export const FLAP_DURATION = 480;
export const CLEAR_DURATION = 320;
const MAX_PENDING = 8;

export interface HeroTiming {
	horizontalStagger: number;
	verticalStagger: number;
}

export const DEFAULT_HERO_TIMING: Readonly<HeroTiming> = {
	horizontalStagger: 45,
	verticalStagger: 90,
};

export interface HeroBit {
	value: number;
	previous: number;
	highlighted: boolean;
	previousHighlighted: boolean;
	sequence: number;
}

interface Arrival {
	value: number;
	at: number;
	end: number;
	changed: boolean;
}

interface Lane {
	readyAt: number;
	pending: Arrival[];
}

/** Each flap finishes its own movement; new waves never restart the whole board. */
export class HeroCascade {
	input: number;

	readonly cells: HeroBit[][];

	readonly timing: HeroTiming;

	private readonly lanes: Lane[][];

	constructor(
		private readonly hashRows: (input: number) => readonly number[],
		input = HERO_INPUT,
		timing?: HeroTiming,
	) {
		this.timing = timing ?? { ...DEFAULT_HERO_TIMING };
		this.input = input;
		this.cells = hashRows(input).map((value) =>
			Array.from({ length: HERO_BITS }, (_, column) => {
				const bit = (value >>> (HERO_BITS - column - 1)) & 1;
				return {
					value: bit,
					previous: bit,
					highlighted: false,
					previousHighlighted: false,
					sequence: 0,
				};
			}),
		);
		this.lanes = this.cells.map((row) =>
			row.map(() => ({ readyAt: 0, pending: [] })),
		);
	}

	flip(bit: number, time: number): void {
		this.input = (this.input ^ (1 << bit)) >>> 0;
		const rows = this.hashRows(this.input);
		for (const [row, cells] of this.cells.entries()) {
			for (const [column, cell] of cells.entries()) {
				const lane = this.lanes[row]![column]!;
				const value = (rows[row]! >>> (HERO_BITS - column - 1)) & 1;
				// Coalesce only the tail under sustained input. Every click still changes
				// the input and final hashes, without an unbounded animation backlog.
				const replacing = lane.pending.length === MAX_PENDING;
				const tail = lane.pending.at(replacing ? -2 : -1);
				const changed = value !== (tail?.value ?? cell.value);
				if (!replacing && !changed && !(tail?.changed ?? cell.highlighted)) {
					continue;
				}
				const arrival =
					time +
					row * this.timing.verticalStagger +
					Math.abs(column - (HERO_BITS - bit - 1)) *
						this.timing.horizontalStagger;
				const at = Math.max(arrival, tail?.end ?? lane.readyAt);
				const event = {
					value,
					at,
					end: at + (changed ? FLAP_DURATION : CLEAR_DURATION),
					changed,
				};
				if (replacing) {
					lane.pending[lane.pending.length - 1] = event;
				} else {
					lane.pending.push(event);
				}
			}
		}
	}

	advance(time: number, reduced = false): boolean {
		let updated = false;
		for (const [row, cells] of this.cells.entries()) {
			for (const [column, cell] of cells.entries()) {
				const lane = this.lanes[row]![column]!;
				while (lane.pending.length > 0) {
					const event = lane.pending[0]!;
					if (!reduced && (event.at > time || lane.readyAt > time)) {
						break;
					}
					lane.pending.shift();
					if (event.value === cell.value && !cell.highlighted) {
						continue;
					}
					cell.previous = cell.value;
					cell.previousHighlighted = cell.highlighted;
					cell.value = event.value;
					cell.highlighted = cell.previous !== cell.value;
					cell.sequence++;
					lane.readyAt =
						time +
						(reduced ? 0 : cell.highlighted ? FLAP_DURATION : CLEAR_DURATION);
					updated = true;
				}
			}
		}
		return updated;
	}

	isBusy(time: number): boolean {
		return this.lanes.some((row) =>
			row.some((lane) => lane.pending.length > 0 || lane.readyAt > time),
		);
	}
}
