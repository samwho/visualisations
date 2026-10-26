import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import speaker from "../../../../static/images/icons/framework7/cropped/speaker_2.svg";
import mutedSpeaker from "../../../../static/images/icons/framework7/cropped/speaker_slash.svg";
import "../../../shared/components/Button";
import "../../../shared/components/Tooltip";
import { HeroAudio } from "./HeroAudio";

const SILENT_MODE_HINT = "No sound? Check Silent Mode and volume.";

@customElement("s-hashing-sound")
export class HashingSound extends LitElement {
	@state() private muted = true;

	@state() private error = "";

	@state() private hintVisible = false;

	private audio?: HeroAudio;

	private unmuteAttempts = 0;

	static override styles = css`
		:host {
			display: block;
			opacity: 0;
			visibility: hidden;
			transition:
				opacity var(--motion-duration-move) var(--motion-ease-in-out),
				visibility 0s linear var(--motion-duration-move);
		}
		:host([hero-visible]) {
			opacity: 1;
			visibility: visible;
			transition-delay: 0s;
		}
		@media (prefers-reduced-motion: reduce) {
			:host {
				transition: none;
			}
		}
		svg {
			width: 100%;
			height: 100%;
			fill: currentColor;
		}
		.status {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
		}
	`;

	setHeroVisible(visible: boolean): void {
		this.toggleAttribute("hero-visible", visible);
	}

	play(): void {
		if (!this.muted) {
			this.audio?.play();
		}
	}

	stop(): void {
		this.audio?.stop();
	}

	private readonly toggle = async (): Promise<void> => {
		this.muted = !this.muted;
		this.error = "";
		this.hintVisible = false;
		if (this.muted) {
			this.stop();
			return;
		}
		this.unmuteAttempts++;
		this.hintVisible = this.unmuteAttempts === 2;
		try {
			this.audio ??= new HeroAudio();
			await this.audio.enable();
		} catch {
			if (this.isConnected && !this.muted) {
				this.muted = true;
				this.hintVisible = false;
				this.error = "Unable to load flip sounds. Try unmuting again.";
			}
		}
	};

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.audio?.dispose();
		this.audio = undefined;
		this.muted = true;
		this.hintVisible = false;
	}

	protected override render() {
		return html`
			<s-tooltip
				text=${SILENT_MODE_HINT}
				trigger="manual"
				.open=${this.hintVisible}
			>
				<s-button
					appearance="outlined"
					variant="neutral"
					label="Mute flip sounds"
					title=${this.muted ? "Unmute flip sounds" : "Mute flip sounds"}
					.pressed=${this.muted}
					@click=${this.toggle}
				>
					<span
						slot="icon"
						aria-hidden="true"
						>${unsafeSVG(this.muted ? mutedSpeaker : speaker)}</span
					>
				</s-button>
			</s-tooltip>
			<span
				class="status"
				role="status"
				>${this.error}</span
			>
		`;
	}
}
