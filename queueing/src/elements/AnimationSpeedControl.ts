import { gsap } from "gsap";
import { ToggleControl } from "./ToggleControl";
import { customElement } from "../core/Decorators";

@customElement("s-animation-speed-control")
export default class AnimationSpeedControl extends ToggleControl {
  callback(option: string) {
    gsap.globalTimeline.timeScale(parseFloat(option));
  }

  formatOption(option: string): string {
    return `${parseFloat(option) * 100}%`;
  }
}
