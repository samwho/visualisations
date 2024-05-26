import { HStack, VStack, LayoutContainer, Leaf } from "pixijs-layout";
import { Application } from "../core/Application";
import { customElement } from "../core/Decorators";
import { FifoQueue, LifoQueue, PriorityQueue, Queue } from "../graphics/Queue";
import { Server } from "../graphics/Server";
import { Duration } from "../core/Duration";
import { RequestButton } from "../graphics/RequestButton";
import { Priority } from "../graphics/Item";
import { SVG } from "../core/SVG";
import { getColor } from "../core/Colors";
import { Graphics } from "pixi.js-legacy";

class Row extends LayoutContainer {
  public server: Server;
  public queue: Queue;

  constructor({
    name,
    icon,
    type,
    aqm,
    application,
  }: {
    name: string;
    icon: SVGElement;
    type: "fifo" | "lifo" | "priority";
    aqm?: "red";
    application: Application;
  }) {
    const server = new Server({}, application);
    server.zIndex = 10;

    let queueType: typeof FifoQueue | typeof LifoQueue | typeof PriorityQueue;
    let opts: ConstructorParameters<typeof queueType>[0] = {
      name,
      icon,
      capacity: 5,
      orientation: "horizontal",
      startFrom: "right",
      elopeOnDrop: false,
      aqm,
    };
    if (type === "fifo") {
      queueType = FifoQueue;
    } else if (type === "lifo") {
      queueType = LifoQueue;
      opts.startFrom = "left";
    } else if (type === "priority") {
      queueType = PriorityQueue;
    } else {
      throw new Error(`Unknown queue type: ${type}`);
    }

    const queue = new queueType(opts, application);
    let iconGraphics: Graphics = new Graphics();

    // Massive, massive hack because I could not figure out why the SVG.toSprite
    // method caused a rare bug where icons would render at 2000x2000. I was
    // not able to consistently reproduce the problem, the few times I did get
    // it I was able to determine that SVG.toSprite would return 1x1 sprites
    // that, when eventually resized by the layout system, would be 2000x2000
    // with a scale of 0.2. Except _sometimes_, the scale would be 20? I really
    // don't know why and I gave up on it.
    iconGraphics.beginFill(0xffffff);
    iconGraphics.name = `icon-${name}`;
    if (name === "FIFO") {
      iconGraphics.drawCircle(0, 0, 10);
      iconGraphics.tint = getColor(2).toNumber();
    } else if (name === "LIFO") {
      iconGraphics.moveTo(5, 0);
      iconGraphics.lineTo(10, 10);
      iconGraphics.lineTo(0, 10);
      iconGraphics.lineTo(5, 0);
      iconGraphics.tint = getColor(3).toNumber();
      iconGraphics.pivot.set(5, 5);
    } else if (name === "PQ") {
      iconGraphics.drawRect(0, 0, 10, 10);
      iconGraphics.tint = getColor(4).toNumber();
      iconGraphics.pivot.set(5, 5);
    } else if (name === "RED") {
      iconGraphics.moveTo(0, 5);
      iconGraphics.lineTo(5, 0);
      iconGraphics.lineTo(10, 5);
      iconGraphics.lineTo(5, 10);
      iconGraphics.lineTo(0, 5);
      iconGraphics.tint = getColor(5).toNumber();
      iconGraphics.pivot.set(5, 5);
    }

    iconGraphics.endFill();

    super(
      HStack(Leaf(iconGraphics).maxWidth(20).minWidth(20), queue, server)
        .leaves((leaf) => leaf.fit().padding(10))
        .proportions(0.25, 3, 1)
    );

    this.server = server;
    this.queue = queue;
  }

  async remove(): Promise<void> {
    const item = this.queue.remove();
    if (!item) {
      return;
    }
    await this.server.process(item);
  }

  async main() {
    while (true) {
      await this.queue.hasItems();
      await this.remove();
    }
  }
}

@customElement("s-multi-queues", {
  height: "400px",
  minWidth: "300px",
  marginBottom: "2rem",
  marginTop: "1rem",
})
export class MultiQueues extends Application {
  queues: Row[];
  interval: Duration;
  timeout?: Duration;

  constructor(...args: ConstructorParameters<typeof Application>) {
    super(...args);
    this.stage.interactiveChildren = true;

    this.interval = Duration.seconds(
      this.getAttribute("interval", parseFloat) || 2
    );

    const timeout = this.getAttribute("timeout", parseFloat);
    if (timeout) {
      this.timeout = Duration.seconds(timeout);
    }

    this.queues = [
      new Row({
        name: "FIFO",
        icon: SVG.circle({
          style: {
            color: getColor(2).toRgbaString(),
          },
        }),
        type: "fifo",
        application: this,
      }),
      new Row({
        name: "LIFO",
        icon: SVG.triangle({
          style: {
            color: getColor(3).toRgbaString(),
          },
        }),
        type: "lifo",
        application: this,
      }),
      new Row({
        name: "PQ",
        icon: SVG.square({
          style: {
            color: getColor(4).toRgbaString(),
          },
        }),
        type: "priority",
        application: this,
      }),
      new Row({
        name: "RED",
        icon: SVG.diamond({
          style: {
            color: getColor(5).toRgbaString(),
          },
        }),
        type: "priority",
        aqm: "red",
        application: this,
      }),
    ];

    const button = new RequestButton(
      { target: this.queues.map((q) => q.queue), timeout: this.timeout },
      this
    );

    const hiPrioButton = new RequestButton(
      {
        target: this.queues.map((q) => q.queue),
        priority: Priority.HIGH,
        timeout: this.timeout,
      },
      this
    );

    this.registerLayout(
      HStack(
        VStack(hiPrioButton, button).leaves((leaf) =>
          leaf.padding(15).maxWidth(80).minWidth(60)
        ),
        VStack(...this.queues)
      )
        .proportions(1, 3)
        .leaves((leaf) => leaf.fit())
    );

    for (const queue of this.queues) {
      queue.main();
    }
  }

  override onVisible(): void {
    super.onVisible();
    this.alwaysVisible();
  }
}
