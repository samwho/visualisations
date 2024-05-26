import { Application } from "../core/Application";
import { getColor } from "../core/Colors";
import { customElement } from "../core/Decorators";
import { Queue } from "../graphics/Queue";
import { AppLinkedBarGraph } from "./AppLinkedBarGraph";

@customElement("s-timeouts-served-graph", {
  marginBottom: "2em",
})
export class TimeoutsServedGraph extends AppLinkedBarGraph {
  queueForRequest: { [key: string]: Queue } = {};

  override async init(app: Application) {
    super.init(app);

    app.events.persistentOn("queue-created", (queue) => {
      if (!queue.name) throw new Error("Queue must have a name");
      if (!queue.icon) throw new Error("Queue must have an icon");

      this.createCounter(queue.name, {
        icon: queue.icon,
        segments: [
          { backgroundColor: getColor(3), color: "white" },
          { backgroundColor: getColor(0), color: "white" },
        ],
      });
    });

    app.events.on("request-queued", (item, queue) => {
      this.queueForRequest[item.id] = queue;
    });

    app.events.on("request-served", (item, server) => {
      const queue = this.queueForRequest[item.id];
      delete this.queueForRequest[item.id];
      if (!queue.name) throw new Error("Queue must have a name");
      if (item.timedOut) {
        this.increment(queue.name, item.priority);
      }
    });
  }
}
