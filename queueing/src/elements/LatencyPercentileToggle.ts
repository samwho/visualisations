import { ToggleControl } from "./ToggleControl";
import { customElement } from "../core/Decorators";
import { WaitTimeBarGraph } from "./WaitTimeBarGraph";

@customElement("s-latency-percentile-toggle")
export default class LatencyPercentileToggle extends ToggleControl {
  callback(option: string) {
    const targetId = this.getAttribute("target");
    if (!targetId) {
      throw new Error("Missing target attribute");
    }

    const application = document.getElementById(targetId) as WaitTimeBarGraph;
    if (!application) {
      throw new Error(`No application with id ${targetId}`);
    }

    application.setPercentile(parseInt(option));
  }

  formatOption(option: string): string {
    return `${parseInt(option)}th`;
  }
}
