import { Application } from "../core/Application";
import { getColor } from "../core/Colors";
import { customElement } from "../core/Decorators";
import { Priority } from "../graphics/Item";
import { Queue } from "../graphics/Queue";
import { AppLinkedBarGraph } from "./AppLinkedBarGraph";

@customElement("s-wait-time-bar-graph", {
  marginBottom: "0.5rem",
})
export class WaitTimeBarGraph extends AppLinkedBarGraph {
  private queues: Queue[] = [];
  private _percentile: number = 50;

  override async init(app: Application) {
    super.init(app);

    app.events.persistentOn("queue-created", (queue) => {
      if (!queue.name) throw new Error("Queue must have a name");
      if (!queue.icon) throw new Error("Queue must have an icon");

      this.queues.push(queue);
      this.createCounter(queue.name, {
        icon: queue.icon,
        format: "separate",
        segments: [
          {
            backgroundColor: getColor(3),
            color: "white",
            valueFormatter: (value) => `${(value / 1000).toFixed(1)}s`,
          },
          {
            backgroundColor: getColor(0),
            color: "white",
            valueFormatter: (value) => `${(value / 1000).toFixed(1)}s`,
          },
        ],
      });
    });

    app.events.on("request-served", () => this._update());
  }

  setPercentile(value: number) {
    this._percentile = value;
    this._update();
  }

  _update() {
    for (const queue of this.queues) {
      if (!queue.name) throw new Error("Queue must have a name");
      this.set(
        queue.name,
        Priority.HIGH,
        queue.waitTimePercentile(Priority.HIGH, this._percentile)
      );
      this.set(
        queue.name,
        Priority.LOW,
        queue.waitTimePercentile(Priority.LOW, this._percentile)
      );
    }
  }
}
