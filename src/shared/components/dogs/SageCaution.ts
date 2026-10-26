import { customElement } from "lit/decorators.js";
import { DogBase, type DogPortrait } from "../DogBase";
import artwork from "../../../../static/images/dogs/sage/caution.svg";
import { portrait as petPortrait } from "./Sage";

export const portrait = {
	name: "Sage",
	artwork: artwork,
	bounds: [129, 164, 481, 541],
	alt: { en: "A picture of an old husky dog with a concerned expression." },
} satisfies DogPortrait;

@customElement("s-sage-caution")
export class SageCaution extends DogBase {
	protected override readonly portrait = portrait;

	protected override readonly petPortrait = petPortrait;
}
