import { customElement } from "lit/decorators.js";
import { DogBase, type DogPortrait } from "../DogBase";
import artwork from "../../../../static/images/dogs/haskie/confused.svg";
import { portrait as petPortrait } from "./Haskie";

export const portrait = {
	name: "Haskie",
	artwork: artwork,
	bounds: [168, 53, 419, 653],
	alt: {
		en: 'A picture of a cartoon husky puppy called "Haskie" looking confused.',
		es: 'Un dibujo animado de un cachorro de husky llamado "Haskie" con cara de confusión.',
	},
} satisfies DogPortrait;

@customElement("s-haskie-confused")
export class HaskieConfused extends DogBase {
	protected override readonly portrait = portrait;

	protected override readonly petPortrait = petPortrait;
}
