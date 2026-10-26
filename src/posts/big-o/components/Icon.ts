import { customElement } from "lit/decorators.js";
import { IconElement } from "../../../shared/components/Icon";
import play from "../../../../static/images/icons/framework7/cropped/play_fill.svg";
import pause from "../../../../static/images/icons/framework7/cropped/pause_fill.svg";
import restart from "../../../../static/images/icons/framework7/cropped/arrow_counterclockwise.svg";
import back from "../../../../static/images/icons/framework7/cropped/backward_end_fill.svg";
import forward from "../../../../static/images/icons/framework7/cropped/forward_end_fill.svg";
import up from "../../../../static/images/icons/framework7/cropped/arrow_up.svg";
import down from "../../../../static/images/icons/framework7/cropped/arrow_down.svg";
import star from "../../../../static/images/icons/framework7/cropped/star_fill.svg";
import thumbsDown from "../../../../static/images/icons/framework7/cropped/hand_thumbsdown_fill.svg";
import shuffle from "../../../../static/images/icons/framework7/cropped/shuffle.svg";
import slider from "../../../../static/images/icons/slider.svg";

@customElement("s-icon")
export class Icon extends IconElement {
	static override icons = {
		play,
		pause,
		restart,
		back,
		forward,
		up,
		down,
		star,
		"thumbs-down": thumbsDown,
		shuffle,
		slider,
	};
}
