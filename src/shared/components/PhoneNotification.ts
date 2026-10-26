import { ResizeController } from "../core/controllers/ResizeController";
import { css, html, LitElement, unsafeCSS } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import { TimelineController } from "../core/controllers/TimelineController";
import { prefersReducedMotion } from "../Accessibility";
import artwork from "./phone-notification/iphone.svg";
import screenMask from "./phone-notification/screen-mask.svg";
import "./phone-notification/IOSNotification";
import type { IOSNotification } from "./phone-notification/IOSNotification";

@customElement("s-phone-notification")
export class PhoneNotification extends LitElement {
	@property({ attribute: "app-name" }) appName = "Notification";

	@property({ attribute: "notification-title" }) notificationTitle = "";

	@property({ attribute: "icon-src" }) iconSrc = "";

	@property({ attribute: "wallpaper-src" }) wallpaperSrc = "";

	@property({ type: Number, attribute: "hold-duration" }) holdDuration = 3000;

	@state() private visible = false;

	@state() private message = "";

	@query(".phone") private phone!: HTMLElement;

	@query("s-ios-notification") private notification!: IOSNotification;

	private animation?: Animation;

	// The phone deliberately enters from outside the viewport.
	private readonly timeline = new TimelineController(this, undefined, {
		pauseOffscreen: false,
	});

	private generation = 0;

	constructor() {
		super();
		const resize = new ResizeController(this, () => this.notification);
		resize.addEventListener("resize", () => this.updatePeek());
	}

	static override styles = css`
		:host {
			display: block;
			position: fixed;
			bottom: 0;
			inset-inline: 0;
			margin-inline: auto;
			width: min(
				32rem,
				calc(100vw - 2 * var(--space-4)),
				calc(75dvh * 440 / 300)
			);
			pointer-events: none;
			z-index: var(--layer-overlay);
		}
		.peek {
			height: var(--phone-peek-height, 0px);
			overflow: hidden;
		}
		.phone {
			position: relative;
			container-type: inline-size;
			aspect-ratio: 440 / 300;
			overflow: hidden;
			isolation: isolate;
			visibility: hidden;
			transform: translateY(100%);
		}
		.visible {
			visibility: visible;
		}
		.screen {
			position: absolute;
			inset: 0;
			background: var(--color-surface-page);
			/* Clip the wallpaper and banner to the artwork's screen contour, including its notch. */
			mask-image: ${unsafeCSS(`url("data:image/svg+xml,${encodeURIComponent(screenMask)}")`)};
			mask-size: 100% 100%;
		}
		.screen img {
			position: absolute;
			top: 7.167%;
			left: 5.682%;
			width: 88.636%;
			height: 281.333%;
			object-fit: cover;
		}
		svg {
			position: relative;
			display: block;
			width: 100%;
			height: 100%;
		}
		s-ios-notification {
			/* Match the full screen behind the banner, in the artwork's 440-unit frame. */
			--glass-scene-width: 88.636cqw;
			--glass-scene-height: 191.818cqw;
			--glass-scene-left: -2.818cqw;
			--glass-scene-top: -8.75cqw;
			position: absolute;
			top: 20%;
			inset-inline: 8.5%;
		}
		.announcement {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}
	`;

	private updatePeek(): void {
		const padding = (this.phone.clientWidth * 12) / 440;
		const height =
			this.notification.offsetTop + this.notification.offsetHeight + padding;
		this.style.setProperty("--phone-peek-height", `${height}px`);
	}

	/** Shows a delivery-independent preview; newer calls replace it. Resolves when hidden. */
	async show(message: string): Promise<void> {
		const generation = ++this.generation;
		this.animation?.cancel();
		this.visible = true;
		this.message = message;
		await this.updateComplete;
		if (!this.isConnected || generation !== this.generation) {
			return;
		}
		this.notification.hide();
		const reduced = prefersReducedMotion();
		const enter = reduced ? 150 : 600;
		const bannerEnter = reduced ? 150 : 400;
		const exit = reduced ? 150 : 500;
		const duration = enter + bannerEnter + this.holdDuration + exit;
		const shownAt = enter / duration;
		const hiddenAt = 1 - exit / duration;
		const frames: Keyframe[] = reduced
			? [
					{ opacity: 0, transform: "none", offset: 0 },
					{ opacity: 1, transform: "none", offset: shownAt },
					{ opacity: 1, transform: "none", offset: hiddenAt },
					{ opacity: 0, transform: "none", offset: 1 },
				]
			: [
					{
						transform: "translateY(100%)",
						offset: 0,
						easing: "cubic-bezier(0.16, 1, 0.3, 1)",
					},
					{ transform: "translateY(0)", offset: shownAt },
					{ transform: "translateY(0)", offset: hiddenAt, easing: "ease-in" },
					{ transform: "translateY(100%)", offset: 1 },
				];
		const animation = this.phone.animate(frames, { duration });
		this.timeline.resume();
		this.timeline.registerAnimation(animation);
		this.animation = animation;
		// Observe cancellation before waiting for the banner to render.
		const finished = animation.finished.then(
			() => true,
			() => false,
		);
		await this.notification.show(message, enter, bannerEnter, this.timeline);
		this.updatePeek();
		if (!(await finished)) {
			return;
		}
		if (generation === this.generation) {
			this.visible = false;
			this.message = "";
			this.animation = undefined;
			this.notification.hide();
		}
	}

	override disconnectedCallback(): void {
		this.generation++;
		this.animation?.cancel();
		this.animation = undefined;
		this.visible = false;
		this.message = "";
		super.disconnectedCallback();
	}

	protected override render() {
		return html`
			<div class="peek">
				<div
					class=${this.visible ? "phone visible" : "phone"}
					aria-hidden="true"
				>
					<div class="screen">
						${
							this.wallpaperSrc
								? html`<img
										src=${this.wallpaperSrc}
										alt=""
									/>`
								: ""
						}
						<s-ios-notification
							app-name=${this.appName}
							notification-title=${this.notificationTitle}
							icon-src=${this.iconSrc}
							wallpaper-src=${this.wallpaperSrc}
						></s-ios-notification>
					</div>
					${unsafeSVG(artwork)}
				</div>
			</div>
			<span
				class="announcement"
				role="status"
				aria-atomic="true"
			>
				${this.visible ? `${this.appName}: ${this.notificationTitle ? this.notificationTitle + ". " : ""}${this.message}` : ""}
			</span>
		`;
	}
}
