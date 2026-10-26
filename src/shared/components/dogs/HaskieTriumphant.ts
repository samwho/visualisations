import { customElement } from "lit/decorators.js";
import { DogBase, type DogPortrait } from "../DogBase";
import artwork from "../../../../static/images/dogs/haskie/triumphant.svg";
import { portrait as petPortrait } from "./Haskie";

export const portrait = {
	name: "Haskie",
	artwork: artwork,
	bounds: [45, 37, 542, 669],
	alt: { en: 'A picture of a husky dog called "Haskie" looking triumphant.' },
} satisfies DogPortrait;

@customElement("s-haskie-triumphant")
export class HaskieTriumphant extends DogBase {
	protected override readonly portrait = portrait;

	protected override readonly petPortrait = petPortrait;
}
