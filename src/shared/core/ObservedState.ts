export class ObservedState<T> extends EventTarget {
	constructor(private value: T) {
		super();
	}

	get(): T {
		return this.value;
	}

	set(value: T): void {
		if (Object.is(value, this.value)) {
			return;
		}
		this.value = value;
		this.dispatchEvent(new CustomEvent("change", { detail: value }));
	}
}
