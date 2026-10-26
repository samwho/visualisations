import { customElement } from "lit/decorators.js";
import { DogBase, type DogPortrait } from "../DogBase";
import artwork from "../../../../static/images/dogs/doe/mischief.svg";
import { portrait as petPortrait } from "./Doe";

export const portrait = {
	name: "Doe",
	artwork: artwork,
	bounds: [170, 186, 384, 519],
	alt: { en: 'A picture of a cartoon husky called "Doe" looking mischievous.' },
} satisfies DogPortrait;

@customElement("s-doe-mischief")
export class DoeMischief extends DogBase {
	protected override readonly portrait = portrait;

	protected override readonly petPortrait = petPortrait;
}
