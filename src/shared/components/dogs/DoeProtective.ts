import { customElement } from "lit/decorators.js";
import { DogBase, type DogPortrait } from "../DogBase";
import artwork from "../../../../static/images/dogs/doe/protective.svg";
import { portrait as petPortrait } from "./Doe";

export const portrait = {
	name: "Doe",
	artwork: artwork,
	bounds: [90, 206, 464, 499],
	alt: { en: 'A picture of a cartoon husky called "Doe" looking protective.' },
} satisfies DogPortrait;

@customElement("s-doe-protective")
export class DoeProtective extends DogBase {
	protected override readonly portrait = portrait;

	protected override readonly petPortrait = petPortrait;
}
