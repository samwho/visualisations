import { customElement } from "lit/decorators.js";
import { DogBase, type DogPortrait } from "../DogBase";
import artwork from "../../../../static/images/dogs/doe/proud.svg";
import { portrait as petPortrait } from "./Doe";

export const portrait = {
	name: "Doe",
	artwork: artwork,
	bounds: [170, 189, 384, 516],
	alt: { en: 'A picture of a cartoon husky called "Doe" looking proud.' },
} satisfies DogPortrait;

@customElement("s-doe-proud")
export class DoeProud extends DogBase {
	protected override readonly portrait = portrait;

	protected override readonly petPortrait = petPortrait;
}
