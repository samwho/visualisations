import { customElement } from "lit/decorators.js";
import circle from "../../../../static/images/icons/framework7/cropped/circle_fill.svg";
import plus from "../../../../static/images/icons/framework7/cropped/plus.svg";
import minus from "../../../../static/images/icons/framework7/minus.svg";
import checkmark from "../../../../static/images/icons/framework7/cropped/checkmark.svg";
import trash from "../../../../static/images/icons/framework7/cropped/trash.svg";
import shuffle from "../../../../static/images/icons/framework7/cropped/shuffle.svg";
import restart from "../../../../static/images/icons/framework7/cropped/arrow_counterclockwise.svg";
import slider from "../../../../static/images/icons/slider.svg";
import colouredRings from "../../../../static/images/icons/bloom-filters/coloured-rings.svg";
import { IconElement } from "../../../shared/components/Icon";

@customElement("s-icon")
export class Icon extends IconElement {
	static override icons = {
		bit: circle,
		add: plus,
		remove: minus,
		check: checkmark,
		clear: trash,
		shuffle,
		restart,
		slider,
		"coloured-rings": colouredRings,
	};
}
