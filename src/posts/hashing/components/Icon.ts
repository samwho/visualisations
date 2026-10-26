import { customElement } from "lit/decorators.js";
import arrowClockwise from "../../../../static/images/icons/framework7/cropped/arrow_clockwise.svg";
import arrowLeft from "../../../../static/images/icons/framework7/cropped/arrow_left.svg";
import arrowRight from "../../../../static/images/icons/framework7/cropped/arrow_right.svg";
import play from "../../../../static/images/icons/framework7/cropped/play_fill.svg";
import plus from "../../../../static/images/icons/framework7/cropped/plus.svg";
import shuffle from "../../../../static/images/icons/framework7/cropped/shuffle.svg";
import slider from "../../../../static/images/icons/slider.svg";
import { IconElement } from "../../../shared/components/Icon";

@customElement("s-icon")
export class Icon extends IconElement {
	static override icons = {
		arrow_clockwise: arrowClockwise,
		plus,
		play,
		shuffle,
		arrow_left: arrowLeft,
		arrow_right: arrowRight,
		slider,
	};
}
