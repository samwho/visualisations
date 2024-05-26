import { Application } from "../core/Application";
import { getColor } from "../core/Colors";
import { customElement } from "../core/Decorators";
import { Queue } from "../graphics/Queue";
import { AppLinkedBarGraph } from "./AppLinkedBarGraph";

@customElement("s-dropped-bar-graph", {
  marginBottom: "2em",
})
export class DroppedBarGraph extends AppLinkedBarGraph {
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

    app.events.on("request-dropped", (item, dropper) => {
      if (!(dropper instanceof Queue)) return;
      if (!dropper.name) throw new Error("Queue must have a name");
      this.increment(dropper.name, item.priority);
    });
  }
}
