export type SplitFlapHighlight =
	| ""
	| "orange"
	| "pink"
	| "blue"
	| "dark-blue"
	| "green"
	| "yellow"
	| "red"
	| "grey";

export interface SplitFlapFace {
	readonly glyph: string;
	readonly highlight: SplitFlapHighlight;
	readonly quiet: boolean;
	readonly highlightBackground?: string;
	readonly highlightForeground?: string;
	readonly outlined?: boolean;
}

export interface SplitFlapTurn {
	readonly id: number;
	readonly from: SplitFlapFace;
	readonly face: SplitFlapFace;
	readonly delay: number;
	readonly duration: number;
	readonly turning: boolean;
}

/** Each update gets independent leaves; starting another turn never retimes existing leaves. */
export class SplitFlapTransitions {
	current: SplitFlapFace;

	target: SplitFlapFace;

	readonly active: SplitFlapTurn[] = [];

	sequence = 0;

	settledId = 0;

	constructor(face: SplitFlapFace) {
		this.current = this.target = { ...face };
	}

	submit(
		face: SplitFlapFace,
		delay = 0,
		duration = 480,
		instant = false,
	): void {
		const from = this.target;
		this.target = { ...face };
		this.sequence++;
		if (instant) {
			this.settle();
			return;
		}
		// A lone highlight removal can fade. During overlapping turns it needs its
		// own leaves, otherwise an unturned glyph would appear on the bottom early.
		const turning =
			this.active.length > 0 ||
			!(
				from.glyph === face.glyph &&
				from.quiet === face.quiet &&
				from.highlight &&
				!face.highlight
			);
		this.active.push({
			id: this.sequence,
			from,
			face: this.target,
			delay,
			duration,
			turning,
		});
	}

	complete(id: number): SplitFlapFace | undefined {
		const index = this.active.findIndex((turn) => turn.id === id);
		if (index === -1) {
			return undefined;
		}
		const turn = this.active.splice(index, 1)[0]!;
		// Changing duration/delay can make turns finish out of order. Never let an
		// older completion replace a newer settled glyph or highlight.
		if (turn.id > this.settledId) {
			this.current = turn.face;
			this.settledId = turn.id;
		}
		return turn.face;
	}

	settle(): void {
		this.current = this.target;
		this.settledId = this.sequence;
		this.active.length = 0;
	}
}
