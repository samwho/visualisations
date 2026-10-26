import { css } from "lit";

export const splitFlapColours = css`
	:host {
		/* Match tint lightness to the neutral leaf; ordinary shared tints are brighter. */
		--_face-lightness: 0.903688;
		--_face-foreground: var(--color-text-secondary);
		--_face-surface: oklch(var(--_face-lightness) 0.00121 93.283741);
		--_highlight-grey-surface: oklch(var(--_face-lightness) 0.016356 264.182);
		--_highlight-green-surface: oklch(var(--_face-lightness) 0.02985 165.4589);
		--_highlight-orange-surface: oklch(var(--_face-lightness) 0.029152 76.7682);
		--_highlight-yellow-surface: oklch(var(--_face-lightness) 0.02985 105.0401);
		--_highlight-pink-surface: oklch(var(--_face-lightness) 0.021095 346.3242);
		--_highlight-dark-blue-surface: oklch(
			var(--_face-lightness) 0.017834 244.0497
		);
		--_highlight-blue-surface: oklch(var(--_face-lightness) 0.01917 236.1773);
		--_highlight-red-surface: oklch(var(--_face-lightness) 0.018843 47.5147);
	}
	:host([data-theme="dark"]) {
		--_face-lightness: 0.26;
		--_face-foreground: var(--color-text-primary);
		--_face-surface: oklch(var(--_face-lightness) 0.005492 38.980357);
		--_highlight-grey-surface: oklch(var(--_face-lightness) 0.02283 264.182);
		--_highlight-green-surface: oklch(var(--_face-lightness) 0.03 165.4589);
		--_highlight-orange-surface: oklch(var(--_face-lightness) 0.03 76.7682);
		--_highlight-yellow-surface: oklch(var(--_face-lightness) 0.03 105.0401);
		--_highlight-pink-surface: oklch(var(--_face-lightness) 0.03 346.3242);
		--_highlight-dark-blue-surface: oklch(var(--_face-lightness) 0.03 244.0497);
		--_highlight-blue-surface: oklch(var(--_face-lightness) 0.03 236.1773);
		--_highlight-red-surface: oklch(var(--_face-lightness) 0.03 47.5147);
	}
`;
