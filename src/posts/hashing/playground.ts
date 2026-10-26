import "./components/Playground";
import { TimelineController } from "../../shared/core/controllers/TimelineController";
import { MediaQueryController } from "../../shared/core/controllers/MediaQueryController";
import "../../shared/components/RadioGroup";
import type { Playground } from "./components/Playground";
import type { RadioGroup } from "../../shared/components/RadioGroup";
import type { Button } from "../../shared/components/Button";

const playground = document.querySelector<Playground>("s-hashing-playground")!;
const timeline = new TimelineController(playground, undefined, {
	pauseOffscreen: false,
});
timeline.resume();
const direction = document.querySelector<RadioGroup>("#split-direction")!;
const share = document.querySelector<Button>("#share")!;
const status = document.querySelector<HTMLElement>("#share-status")!;
const shared = new URLSearchParams(location.hash.slice(1));
const split = shared.get("split");
if (split === "row" || split === "column") {
	playground.layout = split;
}

direction.options = [
	{ value: "row", label: "Side by side" },
	{ value: "column", label: "Stacked" },
];
const narrowScreen = new MediaQueryController(
	playground,
	"(max-width: 1000px)",
);
const syncDirection = () => {
	direction.value =
		playground.layout ?? (narrowScreen.matches ? "column" : "row");
};

syncDirection();
narrowScreen.addEventListener("change", syncDirection);
direction.addEventListener("change", () => {
	if (direction.value === "row" || direction.value === "column") {
		playground.layout = direction.value;
	}
});

let copiedTimer: number | undefined;
function resetCopied(): void {
	if (copiedTimer !== undefined) {
		timeline.clearTimeout(copiedTimer);
	}
	delete share.dataset.copied;
	share.variant = "neutral";
	share.appearance = "outlined";
	status.textContent = "";
}

let shareUrl = "";
let shareGeneration = 0;
let shareTimer: number | undefined;
function scheduleShareLink(): void {
	resetCopied();
	share.disabled = true;
	shareGeneration++;
	if (shareTimer !== undefined) {
		timeline.clearTimeout(shareTimer);
	}
	shareTimer = timeline.setTimeout(
		() => void refreshShareLink(shareGeneration),
		150,
	);
}

async function refreshShareLink(generation: number): Promise<void> {
	try {
		const url = new URL(location.href);
		// Keep reader code in the fragment, out of server requests.
		url.hash = (await playground.getShareParameters()).toString();
		url.searchParams.delete("theme");
		url.searchParams.delete("encoding");
		if (generation !== shareGeneration) {
			return;
		}
		shareUrl = url.toString();
		share.disabled = false;
	} catch (error) {
		if (generation === shareGeneration) {
			status.textContent = `Couldn't prepare the link: ${String(error)}`;
		}
	}
}

playground.addEventListener("editor-ready", scheduleShareLink);
playground.addEventListener("input", scheduleShareLink);
playground.addEventListener("change", scheduleShareLink);
direction.addEventListener("change", scheduleShareLink);
share.addEventListener("click", () => void copyLink());

async function copyLink(): Promise<void> {
	const prepared = shareUrl;
	try {
		// Compression happens before clicking, preserving clipboard user activation.
		await navigator.clipboard.writeText(prepared);
		if (share.disabled || prepared !== shareUrl) {
			return;
		}
		resetCopied();
		share.dataset.copied = "";
		share.variant = "success";
		share.appearance = "solid";
		status.textContent = "Link copied.";
		copiedTimer = timeline.setTimeout(resetCopied, 2000);
	} catch {
		resetCopied();
		status.textContent = "Couldn't copy the link. Try again.";
	}
}
