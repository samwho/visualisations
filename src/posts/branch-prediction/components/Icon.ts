import { customElement } from "lit/decorators.js";
import { IconElement } from "../../../shared/components/Icon";
import play from "../../../../static/images/icons/framework7/cropped/play_fill.svg";
import restart from "../../../../static/images/icons/framework7/cropped/arrow_counterclockwise.svg";

@customElement("s-icon")
export class Icon extends IconElement {
	static override icons = { play, restart };
}
