import { customElement } from "lit/decorators.js";
import { DogBase, type DogPortrait } from "../DogBase";
import artwork from "../../../../static/images/dogs/sage/despair.svg";
import { portrait as petPortrait } from "./Sage";

export const portrait = {
	name: "Sage",
	artwork: artwork,
	bounds: [170, 190, 440, 515],
	alt: { en: "A picture of an old husky dog with a despairing expression." },
} satisfies DogPortrait;

@customElement("s-sage-despair")
export class SageDespair extends DogBase {
	protected override readonly portrait = portrait;

	protected override readonly petPortrait = petPortrait;
}
