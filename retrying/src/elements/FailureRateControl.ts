import ToggleWithTargetControl from "./ToggleWithTargetControl";

export default class FailureRateControl extends ToggleWithTargetControl {
  static elementName = "failure-rate-control";

  static register() {
    customElements.define(this.elementName, this);
  }

  callback(option: string) {
    this.target.setAttribute("failure-rate", option);
  }

  formatOption(option: string): string {
    return `${parseFloat(option) * 100}%`;
  }
}
