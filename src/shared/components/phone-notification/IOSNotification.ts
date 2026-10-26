import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import { TimelineController } from "../../core/controllers/TimelineController";
import { prefersReducedMotion } from "../../Accessibility";
import bell from "../../../../static/images/icons/framework7/cropped/bell_fill.svg";

@customElement("s-ios-notification")
export class IOSNotification extends LitElement {
	@property({ attribute: "app-name" }) appName = "Notification";

	@property({ attribute: "notification-title" }) notificationTitle = "";

	@property({ attribute: "icon-src" }) iconSrc = "";

	@property({ attribute: "wallpaper-src" }) wallpaperSrc = "";

	@state() private message = "";

	@query(".banner") private banner!: HTMLElement;

	private animation?: Animation;

	private generation = 0;

	private vibrationTimer?: number;

	private readonly timeline = new TimelineController(this, undefined, {
		pauseOffscreen: false,
	});

	private activeTimeline = this.timeline;

	static override styles = css`
		:host {
			/* Fixed dark iOS glass: these simulated material colours don't follow the page theme. */
			--glass-surface: rgb(18 18 30 / 66%);
			--glass-foreground: #fff;
			--glass-highlight: #fff;
			--glass-shadow: #000;
			display: block;
			min-width: 0;
			text-align: left;
			/* Scale the illustrated UI with the phone; the live announcement supplies accessible text. */
			font:
				3.864cqw system-ui,
				sans-serif;
		}
		.banner {
			position: relative;
			isolation: isolate;
			overflow: hidden;
			box-sizing: border-box;
			padding: 0.8235em;
			border: 0.0588em solid
				color-mix(in oklab, var(--glass-shadow) 24%, transparent);
			border-radius: 1.2941em;
			/* Optional enhancement; the displaced wallpaper supplies its own blur. */
			backdrop-filter: blur(0.7059em) saturate(140%);
			box-shadow: 0 0.4706em 1.4118em
				color-mix(in oklab, var(--glass-shadow) 24%, transparent);
			color: var(--glass-foreground);
			opacity: 0;
		}
		.banner::before,
		.banner::after {
			content: "";
			position: absolute;
			inset: 0;
			border-radius: inherit;
			pointer-events: none;
		}
		.banner::before {
			background:
				linear-gradient(
					135deg in oklab,
					color-mix(in oklab, var(--glass-highlight) 8%, transparent),
					transparent 45%,
					color-mix(in oklab, var(--glass-highlight) 3%, transparent)
				),
				var(--glass-surface);
		}
		.banner::after {
			box-shadow:
				inset 0 0.0588em 0.0588em
					color-mix(in oklab, var(--glass-highlight) 50%, transparent),
				inset 0.0588em 0 0.0588em
					color-mix(in oklab, var(--glass-highlight) 22%, transparent),
				inset 0 -0.0588em 0.0588em
					color-mix(in oklab, var(--glass-highlight) 14%, transparent);
		}
		/*
		 * Refraction approach adapted from https://github.com/dpawlikowski/liquid-glass.
		 * MIT License
		 *
		 * Copyright (c) 2026 liquid-glass contributors
		 *
		 * Permission is hereby granted, free of charge, to any person obtaining a copy
		 * of this software and associated documentation files (the "Software"), to deal
		 * in the Software without restriction, including without limitation the rights
		 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
		 * copies of the Software, and to permit persons to whom the Software is
		 * furnished to do so, subject to the following conditions:
		 *
		 * The above copyright notice and this permission notice shall be included in all
		 * copies or substantial portions of the Software.
		 *
		 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
		 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
		 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
		 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
		 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
		 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
		 * SOFTWARE.
		 */
		.refraction {
			position: absolute;
			z-index: -1;
			left: calc(var(--glass-scene-left, 0px) - 0.0588em);
			top: calc(var(--glass-scene-top, 0px) - 0.0588em);
			width: var(--glass-scene-width, 100%);
			height: var(--glass-scene-height, 100%);
			filter: blur(0.1765em) saturate(140%);
		}
		.content {
			position: relative;
			display: flex;
			align-items: center;
			gap: 0.7059em;
		}
		.icon {
			display: grid;
			place-items: center;
			flex: none;
			width: 2.3529em;
			height: 2.3529em;
		}
		.icon img {
			display: block;
			width: 100%;
			height: 100%;
			object-fit: contain;
		}
		.icon svg {
			width: 1.4118em;
			height: 1.4118em;
			fill: currentColor;
		}
		.copy {
			flex: 1;
			min-width: 0;
		}
		header {
			display: flex;
			align-items: baseline;
			gap: 0.4706em;
			font-size: 1em;
			line-height: 1.3;
		}
		.app-name {
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			font-weight: 600;
		}
		.time {
			flex: none;
			margin-inline-start: auto;
			font-size: 0.7647em;
		}
		h3,
		p {
			margin: 0;
			font-size: 1em;
			line-height: 1.3;
			overflow-wrap: anywhere;
		}
		h3 {
			font-weight: 600;
		}
		p {
			max-height: 3.9em;
			overflow: hidden;
		}
	`;

	async show(
		message: string,
		delay: number,
		duration: number,
		timeline = this.timeline,
	): Promise<void> {
		const generation = ++this.generation;
		this.animation?.cancel();
		if (this.vibrationTimer !== undefined) {
			this.activeTimeline.clearTimeout(this.vibrationTimer);
		}
		this.message = message;
		await this.updateComplete;
		if (!this.isConnected || generation !== this.generation) {
			return;
		}
		this.animation = this.banner.animate(
			[
				{
					transform: prefersReducedMotion() ? "none" : "translateY(-120%)",
					opacity: 0,
				},
				{ transform: "none", opacity: 1 },
			],
			{
				delay,
				duration,
				easing: "cubic-bezier(0.16, 1, 0.3, 1)",
				fill: "both",
			},
		);
		this.activeTimeline = timeline;
		if (timeline === this.timeline) {
			timeline.resume();
		}
		timeline.registerAnimation(this.animation);
		// Optional haptics: unsupported browsers (including Safari) need no permission prompt.
		if ("vibrate" in navigator && !prefersReducedMotion()) {
			this.vibrationTimer = timeline.setTimeout(() => {
				this.vibrationTimer = undefined;
				if (this.isConnected && generation === this.generation) {
					navigator.vibrate(40);
				}
			}, delay);
		}
	}

	hide(): void {
		if (this.vibrationTimer !== undefined) {
			this.activeTimeline.clearTimeout(this.vibrationTimer);
		}
		this.vibrationTimer = undefined;
		this.generation++;
		this.animation?.cancel();
		this.animation = undefined;
		this.message = "";
	}

	override disconnectedCallback(): void {
		this.hide();
		super.disconnectedCallback();
	}

	protected override render() {
		return html`
			<div class="banner">
				${
					this.wallpaperSrc
						? html`
								<svg
									class="refraction"
									viewBox="0 0 390 844"
									aria-hidden="true"
								>
									<defs>
										<filter
											id="glass-refraction"
											x="-10%"
											y="-10%"
											width="120%"
											height="120%"
										>
											<feTurbulence
												type="fractalNoise"
												baseFrequency="0.012"
												numOctaves="2"
												seed="7"
												result="noise"
											/>
											<feDisplacementMap
												in="SourceGraphic"
												in2="noise"
												scale="14"
												xChannelSelector="R"
												yChannelSelector="G"
											/>
										</filter>
									</defs>
									<image
										href=${this.wallpaperSrc}
										width="100%"
										height="100%"
										preserveAspectRatio="xMidYMid slice"
										filter="url(#glass-refraction)"
									/>
								</svg>
							`
						: ""
				}
				<div class="content">
					<span
						class="icon"
						aria-hidden="true"
					>
						${
							this.iconSrc
								? html`<img
										src=${this.iconSrc}
										alt=""
									/>`
								: unsafeSVG(bell)
						}
					</span>
					<div class="copy">
						<header>
							<span class="app-name">${this.appName}</span>
							<span class="time">now</span>
						</header>
						${this.notificationTitle ? html`<h3>${this.notificationTitle}</h3>` : ""}
						<p>${this.message}</p>
					</div>
				</div>
			</div>
		`;
	}
}
