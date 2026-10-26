import { customElement } from "lit/decorators.js";
import hare from "../../../../static/images/icons/framework7/cropped/hare.svg";
import tortoise from "../../../../static/images/icons/framework7/cropped/tortoise.svg";
import pause from "../../../../static/images/icons/framework7/cropped/pause_fill.svg";
import play from "../../../../static/images/icons/framework7/cropped/play_fill.svg";
import restart from "../../../../static/images/icons/framework7/cropped/arrow_counterclockwise.svg";
import slider from "../../../../static/images/icons/slider.svg";
import { IconElement } from "../../../shared/components/Icon";

@customElement("s-icon")
export class Icon extends IconElement {
	static override icons = {
		hare,
		tortoise,
		pause,
		play,
		restart,
		slider,
	};
}
