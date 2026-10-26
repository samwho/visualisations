import type { AllocatorCall } from "./Simulation";
import { THREAD_COLORS } from "./MemoryRecording";

export class ElementParser {
	private readonly element: Element;

	private readonly interval: number;

	private readonly threadTime = new Map<number, number>();

	private calls: AllocatorCall[] = [];

	private nextThreadId = 0;

	constructor({
		element,
		interval = 1,
	}: {
		element: Element;
		interval?: number;
	}) {
		this.element = element;
		this.interval = interval;
	}

	parse(): AllocatorCall[] {
		this.calls = [];
		this.threadTime.clear();
		this.nextThreadId = 0;
		this.parseElement(this.element, this.newThreadId());
		this.calls.sort(
			(left, right) => left.time - right.time || left.threadId - right.threadId,
		);
		return this.calls;
	}

	private newThreadId(): number {
		return this.nextThreadId++;
	}

	private parseElement(element: Element, threadId: number): void {
		for (const child of element.children) {
			const time = this.threadTime.get(threadId) ?? 0.1;
			this.threadTime.set(threadId, time);
			const parsedDuration = Number.parseFloat(
				child.getAttribute("duration") ?? "",
			);
			const duration = Number.isNaN(parsedDuration)
				? this.interval
				: parsedDuration;

			if (child.tagName === "THREAD") {
				this.parseElement(child, this.newThreadId());
				continue;
			}

			if (child.tagName === "MALLOC") {
				this.calls.push({
					function: "malloc",
					id: this.scopedId(child, threadId),
					args: [Number.parseInt(child.getAttribute("size") ?? "0", 10)],
					address: this.integerAttribute(child, "addr"),
					threadId,
					color:
						child.getAttribute("color") ??
						THREAD_COLORS[threadId % THREAD_COLORS.length],
					time,
				});
				this.threadTime.set(threadId, time + duration);
			} else if (child.tagName === "FREE") {
				this.calls.push({
					function: "free",
					id: this.scopedId(child, threadId),
					args: [this.integerAttribute(child, "addr") ?? Number.NaN],
					threadId,
					time,
				});
				this.threadTime.set(threadId, time + duration);
			} else if (child.tagName === "SLEEP") {
				// A sleep orders threaded calls but adds no operation or slider step.
				this.threadTime.set(threadId, time + duration);
			}
		}
	}

	private scopedId(element: Element, threadId: number): string | undefined {
		const id = element.getAttribute("id");
		return id === null ? undefined : `${threadId}-${id}`;
	}

	private integerAttribute(element: Element, name: string): number | undefined {
		const value = element.getAttribute(name);
		return value === null ? undefined : Number(value);
	}
}
