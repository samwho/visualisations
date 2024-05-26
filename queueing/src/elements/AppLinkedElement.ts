import { Application } from "../core/Application";
import { GlobalEvents } from "../core/GlobalEvents";

export abstract class AppLinkedElement extends HTMLElement {
  application: Application;

  connectedCallback() {
    const targetId = this.getAttribute("target");
    if (!targetId) {
      throw new Error("Missing target attribute");
    }

    GlobalEvents.onApplicationCreated(targetId, (application) => {
      this.application = application;
      this.init(application);
    });
  }

  abstract init(application: Application): Promise<void>;
}
