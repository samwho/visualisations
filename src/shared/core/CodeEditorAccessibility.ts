// Our vendored Monaco uses complementary landmarks for its alternating live
// regions and leaves its iPad keyboard input unnamed. Correct their semantics
// after editor creation without changing the editor or its announcements.
export function configureEditorAccessibility(
	container: HTMLElement,
	editor: { getContribution(id: string): void },
): void {
	// The keyboard widget is normally created lazily; initialize it through
	// Monaco's public contribution API so its label is present from the start.
	editor.getContribution("editor.contrib.iPadShowKeyboard");
	for (const status of container.ownerDocument.querySelectorAll(
		'.monaco-status[role="complementary"]',
	)) {
		status.setAttribute("role", "status");
	}
	for (const keyboard of container.querySelectorAll(".iPadShowKeyboard")) {
		keyboard.setAttribute("aria-label", "Show on-screen keyboard");
	}
}
