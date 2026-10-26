import { ThemeController } from "../../../shared/core/controllers/ThemeController";
import { LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { configureEditorAccessibility } from "../../../shared/core/CodeEditorAccessibility";

import type { editor } from "monaco-editor";

// The template loads the shared selective Monaco build before this component.
declare global {
	interface Window {
		monaco: typeof import("../../editor");
	}
}

@customElement("s-hashing-code-editor")
export class CodeEditor extends LitElement {
	private editor?: editor.IStandaloneCodeEditor;

	private contentListener?: { dispose(): void };

	constructor() {
		super();
		const theme = new ThemeController(this);
		theme.addEventListener("change", () => {
			if (this.editor) {
				this.syncTheme();
			}
		});
	}

	private syncTheme(): void {
		window.monaco.editor.setTheme(window.monaco.defineSiteTheme());
	}

	private generation = 0;

	// Monaco's stylesheet must reach its DOM. Monaco owns the contents.
	protected override createRenderRoot(): HTMLElement {
		return this;
	}

	get value(): string | undefined {
		return this.editor?.getModel()?.getValue();
	}

	setReadOnly(readOnly: boolean): void {
		this.editor?.updateOptions({ readOnly });
	}

	setValue(code: string): void {
		const model = this.editor?.getModel();
		model?.pushEditOperations(
			[],
			[{ range: model.getFullModelRange(), text: code }],
			() => null,
		);
	}

	override connectedCallback(): void {
		super.connectedCallback();
		const generation = ++this.generation;
		void this.updateComplete.then(() => {
			if (!this.isConnected || generation !== this.generation) {
				return;
			}
			try {
				this.editor = window.monaco.editor.create(this, {
					value: "",
					language: "javascript",
					automaticLayout: true,
					ariaLabel: "Hash function source code",
					scrollBeyondLastLine: false,
					fontSize: 12,
					minimap: { enabled: false },
				});
				configureEditorAccessibility(this, this.editor);
				this.contentListener = this.editor
					.getModel()
					?.onDidChangeContent(() => {
						this.dispatchEvent(new Event("input", { bubbles: true }));
					});
				this.syncTheme();
				document.addEventListener("keydown", this.resizeFont);
				this.dispatchEvent(new Event("editor-ready", { bubbles: true }));
			} catch (error) {
				this.dispatchEvent(
					new CustomEvent("editor-error", {
						detail: `Unable to load the editor: ${String(error)}`,
						bubbles: true,
					}),
				);
			}
		});
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.generation++;
		document.removeEventListener("keydown", this.resizeFont);
		this.contentListener?.dispose();
		const model = this.editor?.getModel();
		this.editor?.dispose();
		model?.dispose();
		this.editor = undefined;
	}

	private resizeFont = (event: KeyboardEvent): void => {
		if (!event.metaKey || !["=", "-"].includes(event.key) || !this.editor) {
			return;
		}
		event.preventDefault();
		const size =
			this.editor.getOption(window.monaco.editor.EditorOption.fontSize) +
			(event.key === "=" ? 1 : -1);
		this.editor.updateOptions({ fontSize: Math.max(6, Math.min(72, size)) });
	};
}
