export type ScopeValue = number | boolean | string | number[] | undefined;

export interface Scope {
	[name: string]: ScopeValue;
	line: number;
}

export type TokenKind =
	| "plain"
	| "keyword"
	| "type"
	| "function"
	| "literal"
	| "operator"
	| "comment";

export interface CodeToken {
	kind: TokenKind;
	text: string;
}

export interface BoundDebuggerProgram extends DebuggerProgram {
	id: string;
}

export interface DebuggerProgram {
	lines: readonly (readonly CodeToken[])[];
	variableNames: readonly string[];
	create: () => Generator<Scope, void>;
}
