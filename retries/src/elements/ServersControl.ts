import ToggleWithTargetControl from "./ToggleWithTargetControl";

export default class ServersControl extends ToggleWithTargetControl {
  static elementName = "servers-control";

  static register() {
    customElements.define(this.elementName, this);
  }

  callback(option: string) {
    this.target.setAttribute("num-servers", option);
  }
}
