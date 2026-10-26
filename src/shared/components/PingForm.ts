import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import paperplane from "../../../static/images/icons/framework7/cropped/paperplane.svg";
import checkmark from "../../../static/images/icons/framework7/cropped/checkmark.svg";
import "./Button";
import "./Input";
import type { Input } from "./Input";
import "./PhoneNotification";
import type { PhoneNotification } from "./PhoneNotification";
import { TimelineController } from "../core/controllers/TimelineController";
import { isLocalPreview, pingTitle, sendPing } from "../Ping";

// Apple iOS 17 dark wallpaper, original-resolution source:
// https://cdn.osxdaily.com/wp-content/uploads/2023/07/ios-17-wallpaper-v2-dark.jpg
const wallpaper = "/images/ping/ios-17-dark.webp";

@customElement("s-ping-form")
export class PingForm extends LitElement {
	@property({ attribute: "notification-title" }) notificationTitle = "";

	@state() private message = "";

	@state() private sending = false;

	@state() private sent = false;

	@state() private confirming = false;

	@state() private error = "";

	@state() private notificationReady = false;

	@query("s-input") private input!: Input;

	@query("form") private form!: HTMLFormElement;

	@query("s-phone-notification") private phone!: PhoneNotification;

	private readonly localPreview = isLocalPreview();

	private request?: AbortController;

	private confirmationTimer?: number;

	private readonly timeline = new TimelineController(this);

	static override styles = css`
		:host {
			display: block;
			max-width: 37.5rem;
			margin-inline: auto;
		}
		form {
			width: 100%;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: var(--space-4);
		}
		s-input {
			width: 100%;
		}
		s-button {
			--button-min-width: 6rem;
		}
		.button-icon,
		.button-icon svg {
			display: block;
			width: var(--control-icon-size);
			height: var(--control-icon-size);
			fill: currentColor;
		}
		.feedback {
			margin: 0;
			width: 100%;
			text-align: center;
			color: var(--color-text-secondary);
			font: var(--type-body-size)/1.5 var(--font-family-body);
		}
		.feedback[hidden] {
			display: none;
		}
		.error {
			color: var(--color-status-danger-foreground);
		}
	`;

	override disconnectedCallback(): void {
		this.request?.abort();
		this.resetConfirmation();
		super.disconnectedCallback();
	}

	private resetConfirmation(): void {
		if (this.confirmationTimer !== undefined) {
			this.timeline.clearTimeout(this.confirmationTimer);
		}
		this.confirmationTimer = undefined;
		this.confirming = false;
	}

	private handleInput(): void {
		this.message = this.input.value;
		this.sent = false;
		this.resetConfirmation();
	}

	private handleKeydown(event: KeyboardEvent): void {
		if (
			event.key !== "Enter" ||
			event.isComposing ||
			// oxlint-disable-next-line typescript/no-deprecated -- Safari delivers compositionend before the confirming Enter.
			event.keyCode === 229
		) {
			return;
		}
		event.preventDefault();
		this.form.requestSubmit();
	}

	private handleSubmit(event: SubmitEvent): void {
		event.preventDefault();
		void this.sendMessage();
	}

	private async sendMessage(): Promise<void> {
		const message = this.message.trim();
		if (!message || this.sending) {
			return;
		}
		this.notificationReady = true;
		this.error = "";
		this.sent = false;
		this.resetConfirmation();
		this.sending = true;
		const request = new AbortController();
		this.request = request;
		try {
			await sendPing(message, request.signal, this.notificationTitle);
			if (request.signal.aborted) {
				return;
			}
			this.message = "";
			this.sent = true;
			this.confirming = true;
			this.timeline.resume();
			this.confirmationTimer = this.timeline.setTimeout(
				() => this.resetConfirmation(),
				1000,
			);
			await this.updateComplete;
			void this.phone.show(message);
		} catch (error) {
			if (!request.signal.aborted) {
				this.error =
					error instanceof Error
						? error.message
						: "Could not send your message. Please try again.";
			}
		} finally {
			this.sending = false;
			this.request = undefined;
		}
	}

	protected override render() {
		const feedback =
			this.error ||
			(this.localPreview
				? this.sent
					? "Preview shown. No notification was sent."
					: "Local preview — messages aren't sent."
				: "");
		return html`
			<form @submit=${this.handleSubmit}>
				<s-input
					label="Message input"
					placeholder="Enter your message here..."
					maxlength="160"
					.value=${this.message}
					.disabled=${this.sending}
					@focusin=${() => {
						this.notificationReady = true;
					}}
					@input=${this.handleInput}
					@keydown=${this.handleKeydown}
				></s-input>
				<s-button
					.loading=${this.sending}
					.disabled=${!this.message.trim() && !this.confirming}
					variant=${this.confirming ? "success" : "neutral"}
					@click=${() => this.form.requestSubmit()}
				>
					<span
						slot="icon"
						class="button-icon"
						aria-hidden="true"
					>
						${unsafeSVG(this.confirming ? checkmark : paperplane)}
					</span>
					${this.confirming ? "Sent" : "Send"}
				</s-button>
				<p
					class=${this.error ? "feedback error" : "feedback"}
					?hidden=${!feedback}
					role="status"
					aria-live="polite"
				>
					${feedback}
				</p>
			</form>
			${
				this.notificationReady
					? html`<s-phone-notification
							app-name=${pingTitle()}
							notification-title=${this.notificationTitle}
							icon-src="/images/s-keycap.svg"
							wallpaper-src=${wallpaper}
						></s-phone-notification>`
					: ""
			}
		`;
	}
}
