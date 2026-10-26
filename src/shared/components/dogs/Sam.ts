import { customElement } from "lit/decorators.js";
import { DogBase, type DogPortrait } from "../DogBase";

export const portrait = {
	name: "Sam",
	artwork:
		'<image href="/images/samwho-2018-profile-14-transparent-200px.png" width="200" height="200"></image>',
	bounds: [39, 18, 133, 182],
	alt: {
		en: "A vector-art picture of a cartoon character representing the author.",
	},
	canvas: [200, 200],
	flip: true,
} satisfies DogPortrait;

@customElement("s-sam")
export class Sam extends DogBase {
	protected override readonly portrait = portrait;
}
