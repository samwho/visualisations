import { ToggleControl } from "./ToggleControl";
import { customElement } from "../core/Decorators";
import { GlobalEvents } from "../core/GlobalEvents";

@customElement("s-left-right-toggle")
export default class LeftRightToggle extends ToggleControl {
  override getOptions(): string[] {
    return ["left", "right"];
  }

  override callback(option: string) {
    if (option !== "left" && option !== "right") {
      throw new Error("Invalid option");
    }
    GlobalEvents.emitHandednessChange(option);
  }
}
