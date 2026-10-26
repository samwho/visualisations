import { prefersReducedMotion } from "../../../shared/Accessibility";
import type { PlayingCard } from "./PlayingCard";
import type { CardPile } from "./CardPile";

const activeMoves = new WeakMap<PlayingCard, Animation[]>();

/** Transfer the actual element; its destination transform is also its resting state. */
export async function moveCard(
	source: CardPile,
	destination: CardPile,
	options: { card?: PlayingCard; flip?: boolean; index?: number } = {},
): Promise<PlayingCard | undefined> {
	const card = options.card ?? source.top;
	if (!card) {
		return undefined;
	}
	const sourceBox = source.getBoundingClientRect();
	const targetBox = destination.getBoundingClientRect();
	const before = getComputedStyle(card).transform;
	const innerBefore = card.shadowRoot?.querySelector<HTMLElement>(".card");
	const previous = activeMoves.get(card);
	const flipTransform = (flipped: boolean) =>
		flipped
			? "translateX(-100%) rotateY(180deg)"
			: "translateX(0%) rotateY(0deg)";

	const beforeFlip =
		innerBefore &&
		(innerBefore.style.transform !== "" ||
			previous?.some(
				(animation) =>
					animation.effect instanceof KeyframeEffect &&
					animation.effect.target === innerBefore,
			))
			? getComputedStyle(innerBefore).transform
			: flipTransform(card.flipped);
	// Reserve the transfer before yielding; a later move must supersede even
	// one that is still waiting for the card's Lit update.
	const animations: Animation[] = [];
	activeMoves.set(card, animations);
	for (const animation of previous ?? []) {
		animation.cancel();
	}

	source.take(card);
	destination.add(card, options.index);
	destination.lift(card);
	const after = card.style.transform;
	const from = `translate(${sourceBox.left - targetBox.left}px, ${sourceBox.top - targetBox.top}px) ${before}`;
	// Keep the captured pose while the first bundled face image is decoded.
	card.style.transform = from;
	if (innerBefore) {
		innerBefore.style.transform = beforeFlip;
	}
	if (options.flip) {
		card.flipped = !card.flipped;
	}
	await card.prepareArtwork();
	if (activeMoves.get(card) !== animations) {
		return card;
	}
	const inner = card.shadowRoot!.querySelector<HTMLElement>(".card")!;
	const afterFlip = flipTransform(card.flipped);
	card.style.transform = after;
	inner.style.removeProperty("transform");
	if (!prefersReducedMotion()) {
		const timing = {
			duration: 500,
			easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
		};
		animations.push(
			destination.animations.trackAnimation(
				card.animate([{ transform: from }, { transform: after }], timing),
			),
		);
		if (beforeFlip !== afterFlip) {
			animations.push(
				destination.animations.trackAnimation(
					inner.animate(
						[{ transform: beforeFlip }, { transform: afterFlip }],
						timing,
					),
				),
			);
		}
	}
	await Promise.all(
		animations.map((animation) => animation.finished.catch(() => {})),
	);
	if (activeMoves.get(card) === animations) {
		destination.land(card);
		activeMoves.delete(card);
	}
	return card;
}
