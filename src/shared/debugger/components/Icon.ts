import { customElement } from "lit/decorators.js";
import { IconElement } from "../../components/Icon";
import play from "../../../../static/images/icons/framework7/cropped/play_fill.svg";
import pause from "../../../../static/images/icons/framework7/cropped/pause_fill.svg";
import restart from "../../../../static/images/icons/framework7/cropped/arrow_counterclockwise.svg";
import back from "../../../../static/images/icons/framework7/cropped/backward_end_fill.svg";
import forward from "../../../../static/images/icons/framework7/cropped/forward_end_fill.svg";

@customElement("s-debugger-icon")
export class DebuggerIcon extends IconElement {
	static override icons = { play, pause, restart, back, forward };
}
