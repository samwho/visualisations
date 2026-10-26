/** Scrollable code examples must also be reachable without a pointer. */
export function makeCodeBlocksFocusable(root: ParentNode = document): void {
	for (const block of root.querySelectorAll<HTMLElement>(".content pre")) {
		block.tabIndex = 0;
	}
}
