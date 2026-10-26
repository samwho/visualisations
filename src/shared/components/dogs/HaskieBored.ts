import { customElement } from "lit/decorators.js";
import { DogBase, type DogPortrait } from "../DogBase";
import artwork from "../../../../static/images/dogs/haskie/bored.svg";
import { portrait as petPortrait } from "./Haskie";

export const portrait = {
	name: "Haskie",
	artwork: artwork,
	bounds: [168, 27, 419, 679],
	alt: {
		en: 'A picture of a cartoon husky puppy called "Haskie" looking bored.',
	},
} satisfies DogPortrait;

@customElement("s-haskie-bored")
export class HaskieBored extends DogBase {
	protected override readonly portrait = portrait;

	protected override readonly petPortrait = petPortrait;
}
