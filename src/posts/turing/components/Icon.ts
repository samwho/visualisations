import { customElement } from "lit/decorators.js";
import { IconElement } from "../../../shared/components/Icon";
import restart from "../../../../static/images/icons/framework7/cropped/arrow_counterclockwise.svg";
import pause from "../../../../static/images/icons/framework7/cropped/pause_fill.svg";
import play from "../../../../static/images/icons/framework7/cropped/play_fill.svg";
import back from "../../../../static/images/icons/framework7/cropped/backward_end_fill.svg";
import forward from "../../../../static/images/icons/framework7/cropped/forward_end_fill.svg";
import question from "../../../../static/images/icons/framework7/cropped/question_circle.svg";
import info from "../../../../static/images/icons/framework7/cropped/info_circle.svg";
import outline from "../../../../static/images/icons/turing/outline.svg";
import head from "../../../../static/images/icons/turing/head.svg";
import tape from "../../../../static/images/icons/turing/tape.svg";
import program from "../../../../static/images/icons/turing/program.svg";

@customElement("s-icon")
export class Icon extends IconElement {
	static override glyphs = {
		jump: "↪︎",
		blank: "␣︎",
	};

	static override icons = {
		restart,
		pause,
		play,
		back,
		forward,
		question,
		info,
		outline,
		head,
		tape,
		program,
	};
}
