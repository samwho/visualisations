import { customElement } from "lit/decorators.js";
import { DogBase, type DogPortrait } from "../DogBase";
import artwork from "../../../../static/images/dogs/doe/amazed.svg";
import { portrait as petPortrait } from "./Doe";

export const portrait = {
	name: "Doe",
	artwork: artwork,
	bounds: [96, 169, 458, 536],
	alt: { en: 'A picture of a cartoon husky called "Doe" looking amazed.' },
} satisfies DogPortrait;

@customElement("s-doe-amazed")
export class DoeAmazed extends DogBase {
	protected override readonly portrait = portrait;

	protected override readonly petPortrait = petPortrait;
}
