import { customElement } from "lit/decorators.js";
import { DogBase, type DogPortrait } from "../DogBase";
import artwork from "../../../../static/images/dogs/sage/proud.svg";
import { portrait as petPortrait } from "./Sage";

export const portrait = {
	name: "Sage",
	artwork: artwork,
	bounds: [170, 174, 440, 531],
	alt: { en: "A picture of an old husky dog with a proud expression." },
} satisfies DogPortrait;

@customElement("s-sage-proud")
export class SageProud extends DogBase {
	protected override readonly portrait = portrait;

	protected override readonly petPortrait = petPortrait;
}
