/*! Monaco Editor 0.57.0 (MIT): /js/licenses/monaco-editor.txt */
import { editor, languages } from "monaco-editor/editor";

// Keep editing, navigation, API documentation and accessibility. Language-server
// services are unnecessary here: the playgrounds report actual execution errors.
import "monaco-editor/features/bracketMatching/register";
import "monaco-editor/features/clipboard/register";
import "monaco-editor/features/comment/register";
import "monaco-editor/features/contextmenu/register";
import "monaco-editor/features/cursorUndo/register";
import "monaco-editor/features/find/register";
import "monaco-editor/features/folding/register";
import "monaco-editor/features/gotoError/register";
import "monaco-editor/features/hover/register";
import "monaco-editor/features/indentation/register";
import "monaco-editor/features/linesOperations/register";
import "monaco-editor/features/multicursor/register";
import "monaco-editor/features/snippet/register";
import "monaco-editor/features/suggest/register";
import "monaco-editor/features/toggleTabFocusMode/register";
import "monaco-editor/features/wordOperations/register";
import "monaco-editor/features/wordPartOperations/register";
import "monaco-editor/features/iPadShowKeyboard/register";
import "monaco-editor/features/quickCommand/register";
import "monaco-editor/features/gotoLine/register";
import "monaco-editor/features/quickHelp/register";
import "monaco-editor/features/toggleHighContrast/register";
import "monaco-editor/features/codicon/register";
import "monaco-editor/languages/definitions/javascript/register";

export function configureEditorWorker(url: string): void {
	// Zola previews can be reached through a different hostname than base_url.
	// Workers must use the page origin, while retaining the asset cache-buster.
	const asset = new URL(url, window.location.href);
	window.MonacoEnvironment = {
		getWorker: () =>
			new Worker(`${asset.pathname}${asset.search}`, { type: "module" }),
	};
}

let colourContext: CanvasRenderingContext2D | null = null;

/** Bridge CSS tokens to APIs such as Monaco that require resolved sRGB hex. */
export function themeColour(token: string): string {
	if (!colourContext) {
		const canvas = document.createElement("canvas");
		canvas.width = canvas.height = 1;
		colourContext = canvas.getContext("2d", { willReadFrequently: true })!;
	}
	const value = getComputedStyle(document.documentElement)
		.getPropertyValue(token)
		.trim();
	colourContext.clearRect(0, 0, 1, 1);
	colourContext.fillStyle = value;
	colourContext.fillRect(0, 0, 1, 1);
	const [red, green, blue] = colourContext.getImageData(0, 0, 1, 1).data;
	return `#${[red!, green!, blue!].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function defineSiteTheme(): string {
	const name = "site";
	editor.defineTheme(name, {
		base: document.documentElement.dataset.theme === "dark" ? "vs-dark" : "vs",
		inherit: true,
		rules: [
			{
				token: "comment",
				foreground: themeColour("--color-editor-comment").slice(1),
			},
			{
				token: "keyword",
				foreground: themeColour("--color-editor-keyword").slice(1),
			},
			{
				token: "string",
				foreground: themeColour("--color-editor-string").slice(1),
			},
			{
				token: "number",
				foreground: themeColour("--color-editor-number").slice(1),
			},
		],
		colors: {
			"editor.background": themeColour("--color-editor-surface"),
			"editor.foreground": themeColour("--color-editor-foreground"),
			"editorGutter.background": themeColour("--color-editor-surface"),
			"editorLineNumber.foreground": themeColour("--color-editor-line-number"),
			"editorLineNumber.dimmedForeground": themeColour(
				"--color-editor-line-number",
			),
			"editorLineNumber.activeForeground": themeColour(
				"--color-editor-line-number-active",
			),
			"editor.selectionBackground": themeColour(
				"--color-surface-code-selected",
			),
			"editorCursor.foreground": themeColour("--color-editor-foreground"),
		},
	});
	return name;
}

export { editor, languages };
export { MarkerSeverity, Range } from "monaco-editor/editor";
