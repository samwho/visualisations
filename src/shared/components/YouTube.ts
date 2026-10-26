import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "./Card";

/** A thumbnail facade: the YouTube player is loaded only after activation. */
@customElement("s-youtube")
export class YouTube extends LitElement {
	@property({ attribute: "video-id" })
	videoId = "";

	@property({ attribute: "video-title" })
	videoTitle = "";

	@property()
	poster = "";

	@property({ attribute: "poster-srcset" })
	posterSrcset = "";

	@property({ attribute: "poster-sizes" })
	posterSizes = "";

	@property({ type: Number })
	start = 0;

	@state()
	private activated = false;

	static override styles = css`
		:host {
			display: block;
		}

		h3 {
			margin: 0;
			padding: var(--space-3);
			font-family: var(--font-family-heading);
			font-size: 1rem;
			line-height: var(--line-height-normal);
			text-align: center;
			color: var(--color-text-primary);
		}

		.frame {
			position: relative;
			aspect-ratio: 16 / 9;
			/* YouTube requires a player at least 200px tall. */
			min-height: 200px;
			overflow: hidden;
			background: var(--color-surface-panel);
		}

		button,
		iframe {
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
			border: 0;
		}

		button {
			padding: 0;
			cursor: pointer;
			background: var(--color-surface-panel);
		}

		button:focus-visible {
			outline: var(--focus-ring-width) solid var(--focus-ring-color);
			outline-offset: -4px;
		}

		img {
			display: block;
			width: 100%;
			height: 100%;
			object-fit: cover;
		}

		.play {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			display: grid;
			place-items: center;
			width: 4rem;
			height: 3rem;
			border-radius: var(--radius-medium);
			background: var(--color-action-neutral-background);
			color: var(--color-action-neutral-foreground);
			box-shadow: var(--shadow-raised);
		}

		.play::before {
			content: "";
			width: 1.25rem;
			height: 1.5rem;
			background: currentColor;
			mask: url("/images/icons/framework7/cropped/play_fill.svg") center /
				contain no-repeat;
		}

		button:hover .play,
		button:focus-visible .play {
			background: var(--color-action-neutral-background-hover);
		}
	`;

	private async play(): Promise<void> {
		this.activated = true;
		await this.updateComplete;
		this.renderRoot.querySelector("iframe")!.focus({ preventScroll: true });
	}

	private get playerUrl(): string {
		const url = new URL(
			`https://www.youtube-nocookie.com/embed/${encodeURIComponent(this.videoId)}`,
		);
		url.search = new URLSearchParams({
			autoplay: "1",
			playsinline: "1",
			start: String(this.start),
		}).toString();
		return url.href;
	}

	override render() {
		return html`
			<s-card full-width>
				<div class="frame">
					${
						this.activated
							? html`<iframe
									src=${this.playerUrl}
									title=${this.videoTitle}
									allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
									allowfullscreen
									referrerpolicy="strict-origin-when-cross-origin"
								></iframe>`
							: html`<button
									type="button"
									aria-label=${`Play ${this.videoTitle} on YouTube`}
									@click=${this.play}
								>
									<img
										src=${this.poster || `https://i.ytimg.com/vi_webp/${encodeURIComponent(this.videoId)}/hqdefault.webp`}
										srcset=${this.posterSrcset || nothing}
										sizes=${this.posterSizes || nothing}
										alt=""
										width="480"
										height="360"
										loading="lazy"
										decoding="async"
										referrerpolicy="no-referrer"
									/>
									<span
										class="play"
										aria-hidden="true"
									></span>
								</button>`
					}
				</div>
				<h3 slot="footer">${this.videoTitle}</h3>
			</s-card>
		`;
	}
}
