import ToggleControl from "./ToggleControl";

export default abstract class ToggleWithTargetControl extends ToggleControl {
  target: HTMLElement;

  constructor() {
    super();

    let id = this.getAttribute("target");
    if (!id) {
      throw new Error("Missing target attribute");
    }

    let target = document.getElementById(id);
    if (!target) {
      throw new Error(`Could not find element with id ${id}`);
    }

    this.target = target;
  }
}
