import { gsap } from "gsap";
import ToggleControl from "./ToggleControl";

export default class AnimationSpeedControl extends ToggleControl {
  static elementName = "animation-speed-control";

  static register() {
    customElements.define(this.elementName, this);
  }

  callback(option: string) {
    gsap.globalTimeline.timeScale(parseFloat(option));
  }

  formatOption(option: string): string {
    return `${parseFloat(option) * 100}%`;
  }
}
