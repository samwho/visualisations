import { LitElement } from "lit";
import { Debugger } from "./Debugger";
import type { Scope } from "../Program";

export abstract class DebuggerConnectedElement extends LitElement {
	private target?: Debugger;

	private connection = 0;

	protected abstract onDebuggerConnected(debuggerElement: Debugger): void;

	protected abstract onDebuggerStep(scope: Scope | undefined): void;

	override connectedCallback(): void {
		super.connectedCallback();
		void this.connectToDebugger(++this.connection).catch(console.error);
	}

	private async connectToDebugger(connection: number): Promise<void> {
		const target = this.closest("s-debugger");
		if (!(target instanceof Debugger)) {
			throw new TypeError(`${this.localName} must be inside an s-debugger`);
		}
		await target.updateComplete;
		// A reconnect can change the parent while its first update is pending.
		if (!this.isConnected || this.connection !== connection) {
			return;
		}
		this.target = target;
		this.onDebuggerConnected(target);
		target.addEventListener("step", this.handleStep);
	}

	private readonly handleStep = (event: Event): void => {
		// SAFETY: the connected debugger publishes bundled-lesson Scope snapshots.
		this.onDebuggerStep((event as CustomEvent<Scope | undefined>).detail);
	};

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.connection += 1;
		this.target?.removeEventListener("step", this.handleStep);
		this.target = undefined;
	}
}
