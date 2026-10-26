import { customElement } from "lit/decorators.js";
import { DogBase, type DogPortrait } from "../DogBase";
import artwork from "../../../../static/images/dogs/haskie/default.svg";

export const portrait = {
	name: "Haskie",
	artwork: artwork,
	bounds: [168, 136, 419, 570],
	alt: { en: 'A picture of a cartoon husky puppy called "Haskie".' },
} satisfies DogPortrait;

@customElement("s-haskie")
export class Haskie extends DogBase {
	protected override readonly portrait = portrait;
}
