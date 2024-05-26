import { HStack, Leaf } from "pixijs-layout";
import { Application } from "../core/Application";
import { customElement } from "../core/Decorators";
import { FifoQueue, LifoQueue, PriorityQueue, Queue } from "../graphics/Queue";
import { Server } from "../graphics/Server";
import { Item, Priority } from "../graphics/Item";
import { Duration } from "../core/Duration";
import { DisplayObject } from "pixi.js-legacy";
import { RequestButton } from "../graphics/RequestButton";

@customElement("s-horizontal-queue", {
  height: `${Item.RADIUS * 4}px`,
  marginBottom: "2rem",
  marginTop: "1rem",
})
export class HorizontalQueue extends Application {
  queue: Queue;
  server: Server;
  timeout?: Duration;
  type: "fifo" | "lifo" | "priority" = "fifo";
  aqm?: "red";

  constructor(...args: ConstructorParameters<typeof Application>) {
    super(...args);
    this.stage.interactiveChildren = true;

    this.server = new Server({}, this);
    this.type = this.getAttribute("type") || "fifo";
    this.aqm = this.getAttribute("aqm");

    const length = this.getAttribute("length", parseFloat) || 5;

    if (this.type === "fifo") {
      this.queue = new FifoQueue(
        {
          capacity: length,
          orientation: "horizontal",
          startFrom: "right",
          aqm: this.aqm,
        },
        this
      );
    } else if (this.type === "priority") {
      this.queue = new PriorityQueue(
        {
          capacity: length,
          orientation: "horizontal",
          startFrom: "right",
          aqm: this.aqm,
        },
        this
      );
    } else {
      this.queue = new LifoQueue(
        {
          capacity: length,
          orientation: "horizontal",
          startFrom: "left",
          aqm: this.aqm,
        },
        this
      );
    }

    const timeout = this.getAttribute("timeout", parseFloat);
    if (timeout) {
      this.timeout = Duration.seconds(timeout);
    }

    const button = new RequestButton(
      { target: this.queue, timeout: this.timeout },
      this
    );

    const elements: DisplayObject[] = [
      Leaf(button).maxHeight(Item.RADIUS * 3),
      Leaf(this.queue).maxHeight(Item.RADIUS * 3),
      Leaf(this.server).maxHeight(Item.RADIUS * 3),
    ];
    const proportions = [1.1, length - 0.1, 1.1];

    if (this.getAttribute("show-hiprio-button") === "true") {
      const hiPrioButton = new RequestButton(
        { target: this.queue, priority: Priority.HIGH, timeout: this.timeout },
        this
      );

      elements.splice(1, 0, Leaf(hiPrioButton).maxHeight(Item.RADIUS * 3));
      proportions.splice(1, 0, 1.1);
    }

    this.registerLayout(
      HStack(...elements)
        .proportions(...proportions)
        .leaves((leaf) =>
          leaf.fit().padding(5).paddingTop(13).paddingBottom(13)
        )
    );

    this.main();
  }

  async removeItemFromQueue(queue: Queue): Promise<void> {
    const item = queue.remove();
    if (!item) {
      return;
    }
    await this.server.process(item);
  }

  async consumer() {
    while (true) {
      await this.queue.hasItems();
      await this.removeItemFromQueue(this.queue);
    }
  }

  async main() {
    this.consumer();
  }
}
