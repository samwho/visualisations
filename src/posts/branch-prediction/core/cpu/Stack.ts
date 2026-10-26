export class Stack {
	items: number[];

	constructor() {
		this.items = [];
	}

	push(item: number) {
		this.items.push(item);
	}

	pop() {
		const item = this.items.pop();
		if (item === undefined) {
			throw new Error("Stack is empty");
		}
		return item;
	}
}
