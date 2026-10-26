import { customElement } from "lit/decorators.js";
import { DogBase, type DogPortrait } from "../DogBase";
import artwork from "../../../../static/images/dogs/haskie/concerned.svg";
import { portrait as petPortrait } from "./Haskie";

export const portrait = {
	name: "Haskie",
	artwork: artwork,
	bounds: [168, 134, 419, 572],
	alt: {
		en: 'A picture of a husky dog called "Haskie" with a concerned expression.',
		es: 'Una foto de un perro husky llamado "Haskie", con una expresión facial de preocupación.',
	},
} satisfies DogPortrait;

@customElement("s-haskie-concerned")
export class HaskieConcerned extends DogBase {
	protected override readonly portrait = portrait;

	protected override readonly petPortrait = petPortrait;
}
