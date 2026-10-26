// The desktop column count is also the fallback before the hero measures its space.
export const COLUMNS = 20;
export const ROWS = 9;

type Tetromino = readonly (readonly number[])[];
type Board = number[][];
export interface Placement {
	piece: Tetromino;
	x: number;
	y: number;
	colour: number;
}

const pieces: Tetromino[] = [
	[[1, 1, 1, 1]],
	[
		[1, 1],
		[1, 1],
	],
	[
		[0, 1, 0],
		[1, 1, 1],
	],
	[
		[0, 1, 1],
		[1, 1, 0],
	],
	[
		[1, 1, 0],
		[0, 1, 1],
	],
	[
		[1, 0, 0],
		[1, 1, 1],
	],
	[
		[0, 0, 1],
		[1, 1, 1],
	],
];

function rotations(piece: Tetromino): Tetromino[] {
	const result: Tetromino[] = [];
	for (let i = 0; i < 4; i++) {
		const current = piece;
		if (
			!result.some((other) => JSON.stringify(other) === JSON.stringify(current))
		) {
			result.push(piece);
		}
		piece = current[0]!.map((_, x) =>
			current.map((row) => row[x]!).toReversed(),
		);
	}
	return result;
}

const variants = pieces.map(rotations);

function emptyBoard(rows: number, columns = COLUMNS): Board {
	return Array.from({ length: rows }, () =>
		Array.from({ length: columns }, () => 0),
	);
}

function fits(board: Board, piece: Tetromino, x: number, y: number): boolean {
	if (x < 0 || y < 0 || x + piece[0]!.length > board[0]!.length) {
		return false;
	}
	return piece.every((row, dy) =>
		row.every(
			(cell, dx) =>
				!cell || (y + dy < board.length && board[y + dy]![x + dx] === 0),
		),
	);
}

function stamp(board: Board, move: Placement): Board {
	const result = board.map((row) => [...row]);
	move.piece.forEach((row, dy) =>
		row.forEach((cell, dx) => {
			if (cell) {
				result[move.y + dy]![move.x + dx] = move.colour;
			}
		}),
	);
	return result;
}

function cleared(board: Board): Board {
	const remaining = board.filter((row) => row.some((cell) => !cell));
	return [
		...Array.from({ length: board.length - remaining.length }, () =>
			Array.from({ length: board[0]!.length }, () => 0),
		),
		...remaining,
	];
}

function cost(board: Board): number {
	const heights = Array.from({ length: board[0]!.length }, () => 0);
	let holes = 0;
	for (let x = 0; x < board[0]!.length; x++) {
		for (let y = 0; y < board.length; y++) {
			if (board[y]![x] !== 0 && heights[x] === 0) {
				heights[x] = board.length - y;
			} else if (board[y]![x] === 0 && heights[x] !== 0) {
				holes++;
			}
		}
	}
	const roughness = heights
		.slice(1)
		.reduce((sum, h, x) => sum + Math.abs(h - heights[x]!), 0);
	return (
		heights.reduce((sum, h) => sum + h, 0) * 0.51 +
		holes * 7 +
		roughness * 0.3 +
		Math.max(...heights) * 0.8
	);
}

function bestMove(
	board: Board,
	kind: number,
	clear = true,
): { move: Placement; score: number } | undefined {
	let best: { move: Placement; score: number } | undefined;
	for (const piece of variants[kind]!) {
		for (let x = 0; x <= board[0]!.length - piece[0]!.length; x++) {
			if (!fits(board, piece, x, 0)) {
				continue;
			}
			let y = 0;
			while (fits(board, piece, x, y + 1)) {
				y++;
			}
			const move = { piece, x, y, colour: kind + 1 };
			const placed = stamp(board, move);
			const lines = placed.filter((row) => row.every(Boolean)).length;
			const score =
				cost(clear ? cleared(placed) : placed) - (clear ? lines * 8 : 0);
			if (!best || score < best.score) {
				best = { move, score };
			}
		}
	}
	return best;
}

const GRAVITY_INTERVAL = 340;
const INPUT_INTERVAL = 80;

interface TimedMove {
	delay: number;
	move?: Placement;
}

function planDrop(
	board: Board,
	kind: number,
	targetRotation: number,
	targetX: number,
) {
	const orientations = variants[kind]!;
	const initial: Placement = {
		piece: orientations[0]!,
		x: Math.floor((board[0]!.length - orientations[0]![0]!.length) / 2),
		y: 0,
		colour: kind + 1,
	};
	if (!fits(board, initial.piece, initial.x, initial.y)) {
		return undefined;
	}
	let move = initial;
	let rotation = 0;
	let inputAt = INPUT_INTERVAL;
	let gravityAt = GRAVITY_INTERVAL;
	let previousTime = 0;
	const path: TimedMove[] = [];

	// Plan early inputs against the same fixed gravity clock used for playback.
	// No late floor slides: an obstructed route is rejected rather than improvised.
	while (true) {
		const positioned = rotation === targetRotation && move.x === targetX;
		const time = Math.min(positioned ? Infinity : inputAt, gravityAt);
		if (!positioned && time === inputAt) {
			const nextRotation =
				rotation === targetRotation
					? rotation
					: (rotation +
							(targetRotation <= orientations.length / 2
								? 1
								: orientations.length - 1)) %
						orientations.length;
			const next =
				rotation === targetRotation
					? { ...move, x: move.x + Math.sign(targetX - move.x) }
					: { ...move, piece: orientations[nextRotation]! };
			if (!fits(board, next.piece, next.x, next.y)) {
				return undefined;
			}
			move = next;
			rotation = nextRotation;
			inputAt += INPUT_INTERVAL;
		}
		if (time === gravityAt) {
			const below = { ...move, y: move.y + 1 };
			if (!fits(board, below.piece, below.x, below.y)) {
				if (rotation !== targetRotation || move.x !== targetX) {
					return undefined;
				}
				path.push({ delay: time - previousTime });
				const placed = stamp(board, move);
				const lines = placed.filter((row) => row.every(Boolean)).length;
				return {
					initial,
					move,
					path,
					score: cost(cleared(placed)) - lines * 8,
				};
			}
			move = below;
			gravityAt += GRAVITY_INTERVAL;
		}
		path.push({ delay: time - previousTime, move });
		previousTime = time;
	}
}

function reachableMove(board: Board, kind: number) {
	let best: ReturnType<typeof planDrop>;
	for (let rotation = 0; rotation < variants[kind]!.length; rotation++) {
		const width = variants[kind]![rotation]![0]!.length;
		for (let x = 0; x <= board[0]!.length - width; x++) {
			const candidate = planDrop(board, kind, rotation, x);
			if (candidate && (!best || candidate.score < best.score)) {
				best = candidate;
			}
		}
	}
	return best;
}

export class HeroTetris {
	board: Board;

	active?: Placement;

	clearing: number[] = [];

	lost = false;

	score = 0;

	private playerLines = 0;

	private bag: number[] = [];

	private route: TimedMove[] = [];

	private playerControlled = false;

	resize(rows: number, columns = this.board[0]!.length): void {
		const rowDelta = rows - this.board.length;
		const columnDelta = columns - this.board[0]!.length;
		if (rowDelta === 0 && columnDelta === 0) {
			return;
		}
		// Keep the floor and settled stack anchored while changing the ceiling.
		const resizedRows =
			rowDelta > 0
				? [...emptyBoard(rowDelta, this.board[0]!.length), ...this.board]
				: this.board.slice(-rowDelta);
		const columnShift = Math.floor(columnDelta / 2);
		this.board = resizedRows.map((row) =>
			Array.from({ length: columns }, (_, x) => row[x - columnShift] ?? 0),
		);
		const wasClearing = this.clearing.length > 0;
		this.clearing = this.clearing
			.map((y) => y + rowDelta)
			.filter((y) => y >= 0);
		if (this.active) {
			const next = {
				...this.active,
				x: Math.max(
					0,
					Math.min(
						columns - this.active.piece[0]!.length,
						this.active.x + columnShift,
					),
				),
				y: Math.max(0, this.active.y + rowDelta),
			};
			if (this.playerControlled) {
				if (fits(this.board, next.piece, next.x, next.y)) {
					this.active = next;
				} else {
					this.active = undefined;
					this.lost = true;
				}
			} else if (columnDelta !== 0) {
				this.spawn();
			} else if (
				this.active.y + rowDelta >= 0 &&
				fits(this.board, next.piece, next.x, next.y) &&
				this.route.every(({ move }) => !move || move.y + rowDelta >= 0)
			) {
				this.active = next;
				this.route = this.route.map(({ delay, move }) => ({
					delay,
					move: move ? { ...move, y: move.y + rowDelta } : undefined,
				}));
			} else {
				this.spawn();
			}
		} else if (wasClearing && this.clearing.length === 0 && !this.lost) {
			this.spawn();
		}
	}

	takeOver(): void {
		this.playerControlled = true;
		this.route = [];
		this.score = 0;
		this.playerLines = 0;
	}

	move(dx: number): void {
		if (!this.active) {
			return;
		}
		const next = { ...this.active, x: this.active.x + dx };
		if (fits(this.board, next.piece, next.x, next.y)) {
			this.active = next;
		}
	}

	rotate(): void {
		if (!this.active) {
			return;
		}
		const current = this.active.piece;
		const piece = current[0]!.map((_, x) =>
			current.map((row) => row[x]!).toReversed(),
		);
		for (const offset of [0, -1, 1, -2, 2]) {
			const next = { ...this.active, piece, x: this.active.x + offset };
			if (fits(this.board, next.piece, next.x, next.y)) {
				this.active = next;
				return;
			}
		}
	}

	drop(soft = true): void {
		if (!this.active) {
			return;
		}
		const next = { ...this.active, y: this.active.y + 1 };
		if (fits(this.board, next.piece, next.x, next.y)) {
			this.active = next;
			if (soft && this.playerControlled) {
				this.score++;
			}
		} else {
			this.lock();
		}
	}

	private lock(): void {
		this.board = stamp(this.board, this.active!);
		this.active = undefined;
		this.clearing = this.board.flatMap((row, y) =>
			row.every(Boolean) ? [y] : [],
		);
		if (this.playerControlled) {
			this.playerLines += this.clearing.length;
			// NES line awards use the level reached by this clear, starting at level zero.
			this.score +=
				[0, 40, 100, 300, 1200][this.clearing.length]! *
				(Math.floor(this.playerLines / 10) + 1);
		}
		if (this.clearing.length === 0) {
			this.spawn();
		}
	}

	get stepDelay(): number {
		return this.route[0]?.delay ?? GRAVITY_INTERVAL;
	}

	constructor(
		staticOnly = false,
		rows = ROWS,
		columns = COLUMNS,
		initialPieces = staticOnly ? 26 : 12,
	) {
		this.board = emptyBoard(rows, columns);
		// Build a settled stack of real tetrominoes, not independent random pixels.
		for (let i = 0; i < initialPieces; i++) {
			const candidate = bestMove(
				this.board,
				(i * 5 + 2) % pieces.length,
				false,
			);
			if (candidate) {
				this.board = stamp(this.board, candidate.move);
			}
		}
		if (!staticOnly) {
			this.spawn();
		}
	}

	private spawn(): void {
		if (this.bag.length === 0) {
			this.bag = pieces.map((_, i) => i);
			for (let i = this.bag.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[this.bag[i], this.bag[j]] = [this.bag[j]!, this.bag[i]!];
			}
		}
		const kind = this.bag.pop()!;
		if (this.playerControlled) {
			const piece = pieces[kind]!;
			const move = {
				piece,
				x: Math.floor((this.board[0]!.length - piece[0]!.length) / 2),
				y: 0,
				colour: kind + 1,
			};
			if (!fits(this.board, piece, move.x, move.y)) {
				this.lost = true;
				this.active = undefined;
				return;
			}
			this.active = move;
			return;
		}
		let candidate = reachableMove(this.board, kind);
		// A decorative game can choose a helpful piece if the random bag gets into trouble.
		if (!candidate || candidate.move.y < this.board.length / 2) {
			for (
				let alternativeKind = 0;
				alternativeKind < pieces.length;
				alternativeKind++
			) {
				const alternative = reachableMove(this.board, alternativeKind);
				if (
					alternative &&
					(!candidate || alternative.score < candidate.score)
				) {
					candidate = alternative;
				}
			}
		}
		if (!candidate) {
			this.board = emptyBoard(this.board.length, this.board[0]!.length);
			candidate = reachableMove(this.board, 0)!;
		}
		this.route = candidate.path;
		this.active = candidate.initial;
	}

	step(): void {
		if (this.clearing.length > 0) {
			this.board = cleared(this.board);
			this.clearing = [];
			this.spawn();
		} else if (this.playerControlled) {
			this.drop(false);
		} else if (this.active) {
			const next = this.route.shift();
			if (next?.move) {
				this.active = next.move;
			} else {
				this.lock();
			}
		}
	}

	cells(): Board {
		return this.active ? stamp(this.board, this.active) : this.board;
	}
}
