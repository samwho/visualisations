import { css, html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";

/**
 * Renders a named SVG or text glyph. Register a subclass as the post's s-icon
 * and declare its static icons (imported SVG strings) and glyphs (plain text).
 * Use it as <s-icon name="play"></s-icon>; the containing control or label owns
 * its accessible meaning.
 *
 * Import cropped Framework7 assets, but keep names such as "play" free of a
 * cropped- prefix. Custom artwork belongs in SVG assets, not subclass CSS.
 *
 * Keep subclasses to mappings and registration, and keep this base a generic
 * renderer. Don't add post-specific behaviour, styling or render overrides to
 * the registries. Consult Sam before making exceptions or expanding this purpose.
 */
export class IconElement extends LitElement {
	static icons: Readonly<Record<string, string>> = {};

	static glyphs: Readonly<Record<string, string>> = {};

	@property({ type: String })
	name = "";

	static override styles = css`
		:host {
			display: inline-block;
			flex: none;
			width: auto;
			height: var(--icon-size-small);
			vertical-align: middle;
		}

		span,
		svg {
			display: block;
			width: auto;
			height: 100%;
		}

		svg {
			max-width: 100%;
			margin-inline: auto;
			fill: currentColor;
		}

		.glyph {
			font-family: var(--icon-glyph-font, var(--font-family-code));
			font-weight: var(--font-weight-regular);
		}
	`;

	protected override render() {
		// SAFETY: instances inherit IconElement's static registries, including subclass overrides.
		const elementClass = this.constructor as typeof IconElement;
		const glyph = elementClass.glyphs[this.name];
		if (glyph !== undefined) {
			return html`<span
				class="glyph"
				aria-hidden="true"
				>${glyph}</span
			>`;
		}

		const icon = elementClass.icons[this.name];
		return icon !== undefined && icon !== ""
			? html`<span aria-hidden="true">${unsafeSVG(icon)}</span>`
			: nothing;
	}
}
