import { customElement } from "lit/decorators.js";
import arrowCounterclockwise from "../../../../static/images/icons/framework7/cropped/arrow_counterclockwise.svg";
import arrowLeft from "../../../../static/images/icons/framework7/cropped/arrow_left.svg";
import arrowRight from "../../../../static/images/icons/framework7/cropped/arrow_right.svg";
import allocated from "../../../../static/images/icons/memory-allocation/allocated.svg";
import available from "../../../../static/images/icons/memory-allocation/available.svg";
import cursor from "../../../../static/images/icons/memory-allocation/cursor.svg";
import freeList from "../../../../static/images/icons/memory-allocation/free-list.svg";
import highlighted from "../../../../static/images/icons/memory-allocation/highlighted.svg";
import metadataFree from "../../../../static/images/icons/memory-allocation/metadata-free.svg";
import metadataSize from "../../../../static/images/icons/memory-allocation/metadata-size.svg";
import smallFreeList from "../../../../static/images/icons/memory-allocation/small-free-list.svg";
import usable from "../../../../static/images/icons/memory-allocation/usable.svg";
import slider from "../../../../static/images/icons/slider.svg";
import { IconElement } from "../../../shared/components/Icon";

@customElement("s-icon")
export class Icon extends IconElement {
	static override icons = {
		arrow_counterclockwise: arrowCounterclockwise,
		arrow_left: arrowLeft,
		arrow_right: arrowRight,
		allocated,
		available,
		reserved: available,
		cursor,
		"metadata-size": metadataSize,
		"metadata-free": metadataFree,
		usable,
		"free-list": freeList,
		highlighted,
		"small-free-list": smallFreeList,
		"large-free-list": freeList,
		slider,
	};
}
