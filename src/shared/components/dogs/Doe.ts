import { customElement } from "lit/decorators.js";
import { DogBase, type DogPortrait } from "../DogBase";
import artwork from "../../../../static/images/dogs/doe/default.svg";

export const portrait = {
	name: "Doe",
	artwork: artwork,
	bounds: [170, 189, 384, 516],
	alt: { en: 'A picture of a cartoon husky called "Doe".' },
} satisfies DogPortrait;

@customElement("s-doe")
export class Doe extends DogBase {
	protected override readonly portrait = portrait;
}
