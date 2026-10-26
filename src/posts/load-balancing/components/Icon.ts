import { customElement } from "lit/decorators.js";
import uncroppedArrowClockwise from "../../../../static/images/icons/framework7/arrow_clockwise.svg";
import uncroppedPauseFill from "../../../../static/images/icons/framework7/pause_fill.svg";
import uncroppedPlayFill from "../../../../static/images/icons/framework7/play_fill.svg";
import uncroppedShuffle from "../../../../static/images/icons/framework7/shuffle.svg";
import arrowClockwise from "../../../../static/images/icons/framework7/cropped/arrow_clockwise.svg";
import hare from "../../../../static/images/icons/framework7/cropped/hare.svg";
import pauseFill from "../../../../static/images/icons/framework7/cropped/pause_fill.svg";
import playFill from "../../../../static/images/icons/framework7/cropped/play_fill.svg";
import shuffle from "../../../../static/images/icons/framework7/cropped/shuffle.svg";
import tortoise from "../../../../static/images/icons/framework7/cropped/tortoise.svg";
import line from "../../../../static/images/icons/load-balancing/line.svg";
import request from "../../../../static/images/icons/load-balancing/request.svg";
import square from "../../../../static/images/icons/load-balancing/square.svg";
import slider from "../../../../static/images/icons/slider.svg";
import { IconElement } from "../../../shared/components/Icon";

@customElement("s-icon")
export class Icon extends IconElement {
	static override icons = {
		"uncropped-arrow_clockwise": uncroppedArrowClockwise,
		"uncropped-pause_fill": uncroppedPauseFill,
		"uncropped-play_fill": uncroppedPlayFill,
		"uncropped-shuffle": uncroppedShuffle,
		"load balancer": square,
		server: square,
		line,
		request,
		arrow_clockwise: arrowClockwise,
		hare,
		pause_fill: pauseFill,
		play_fill: playFill,
		shuffle,
		tortoise,
		slider,
	};
}
