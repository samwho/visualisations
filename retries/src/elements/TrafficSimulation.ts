import Application from "../core/Application";
import CustomElement from "../core/CustomElement";
import { TrafficSimulation as TrafficSimulationApplication } from "../applications/TrafficSimulation";

export default class TrafficSimulation extends CustomElement {
  static elementName = "traffic-simulation";
  static observedAttributes = ["failure-rate", "num-servers"];

  async initApplication(
    root: HTMLElement,
    container: HTMLElement
  ): Promise<Application> {
    return new TrafficSimulationApplication({ root, element: container });
  }

  async preApplicationInit() {}
  async postApplicationInit() {}
}
