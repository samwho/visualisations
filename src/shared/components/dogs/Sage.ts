import { customElement } from "lit/decorators.js";
import { DogBase, type DogPortrait } from "../DogBase";
import artwork from "../../../../static/images/dogs/sage/default.svg";

export const portrait = {
	name: "Sage",
	artwork: artwork,
	bounds: [170, 174, 440, 531],
	alt: {
		en: "A picture of an old husky dog.",
		es: "La imagen de un viejo perro husky.",
	},
} satisfies DogPortrait;

@customElement("s-sage")
export class Sage extends DogBase {
	protected override readonly portrait = portrait;
}
