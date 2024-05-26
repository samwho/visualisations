import { Color, Container, Rectangle } from "pixi.js-legacy";
import { Graphics } from "../core/Graphics";
import { Stats } from "../core/Maths";
import gsap from "gsap";
import { LayoutSize } from "pixijs-layout";
import { Item, Priority } from "./Item";
import { getColor } from "../core/Colors";
export abstract class Queue extends Graphics implements LayoutSize {
  static PADDING = 6;
  static SPACING = 2;
  static STROKE_WIDTH = 2;
  static LINE_WIDTH = 2;
  static BACKGROUND_COLOR = new Color({ r: 230, g: 230, b: 230, a: 1 });
  static STROKE_COLOR = new Color({ r: 0, g: 0, b: 0, a: 0 });

  capacity: number;
  orientation: "horizontal" | "vertical";
  startFrom: "top" | "bottom" | "left" | "right";
  aqm?: "red";
  icon?: SVGElement;
  color?: Color;

  private _slots: Container[] = [];
  private _stats: { [p in Priority]: Stats } = {
    0: new Stats(),
    1: new Stats(),
  };
  private _waitingForItems: (() => void)[] = [];
  private _waitingForSpace: (() => void)[] = [];
  protected _items: Item[] = [];
  protected _elopeOnDrop: boolean;

  private _queueGraphics: Graphics;

  constructor(
    {
      name,
      icon,
      color,
      capacity,
      orientation = "horizontal",
      startFrom = "top",
      aqm,
      elopeOnDrop,
    }: {
      name?: string;
      icon?: SVGElement;
      color?: Color;
      capacity: number;
      orientation?: "horizontal" | "vertical";
      startFrom?: "top" | "bottom" | "left" | "right";
      aqm?: "red";
      elopeOnDrop?: boolean;
    },
    ...args: ConstructorParameters<typeof Graphics>
  ) {
    super(...args);
    this.name = name || null;
    this.icon = icon;
    this.color = color;
    this.capacity = capacity;
    this.orientation = orientation;
    this.startFrom = startFrom;
    this.aqm = aqm;
    this._elopeOnDrop = elopeOnDrop ?? false;
    this._queueGraphics = new Graphics(this.application);
    this.addChild(this._queueGraphics);
    this._drawOutline(this._queueGraphics);
    this._createSlots();
    this.pivot.set(this.width / 2, this.height / 2);

    this.application.events.persistentEmit("queue-created", this);
  }

  eachItem(f: (i: Item) => void) {
    for (const i of this._items) {
      f(i);
    }
  }

  protected shouldDrop(item: Item): boolean {
    if (this._items.length === this.capacity) {
      return true;
    }

    if (this.aqm === "red" && item.priority === 1) {
      return Math.random() < this._items.length / this.capacity;
    }

    return false;
  }

  protected getQueueBounds(): Rectangle {
    return this._queueGraphics.getBounds();
  }

  async hasItems(): Promise<void> {
    if (this._items.length > 0) {
      return;
    }
    return new Promise<void>((resolve) => {
      this._waitingForItems.push(resolve);
    });
  }

  async hasSpace(): Promise<void> {
    if (this._items.length < this.capacity) {
      return;
    }
    return new Promise<void>((resolve) => {
      this._waitingForSpace.push(resolve);
    });
  }

  get size(): number {
    return this._items.length;
  }

  getLayoutWidth(): number {
    return this._queueGraphics.width;
  }
  getLayoutHeight(): number {
    return this._queueGraphics.height;
  }

  _createSlots() {
    for (let i = 0; i < this.capacity; i++) {
      const slot = new Container();
      if (this.orientation === "horizontal") {
        slot.x =
          i * Item.RADIUS * 2 + Item.RADIUS + Queue.PADDING + i * Queue.SPACING;
        slot.y = this.height / 2;
      } else {
        slot.x = this.width / 2;
        slot.y =
          i * Item.RADIUS * 2 + Item.RADIUS + Queue.PADDING + i * Queue.SPACING;
      }
      this.addChild(slot);
      this._slots.push(slot);
    }

    if (this.startFrom === "bottom" || this.startFrom === "right") {
      this._slots.reverse();
    }
  }

  _drawOutline(g: Graphics) {
    const leftX = Item.RADIUS + Queue.PADDING;
    const leftY = Item.RADIUS + Queue.PADDING;

    g.beginFill(Queue.BACKGROUND_COLOR);
    const alpha = Queue.STROKE_COLOR.alpha;
    g.lineStyle(Queue.STROKE_WIDTH, Queue.STROKE_COLOR, alpha, 0, true);

    if (this.orientation === "horizontal") {
      g.drawCircle(leftX, leftY, Item.RADIUS + Queue.PADDING);
      g.drawCircle(
        leftX +
          (this.capacity - 1) * Item.RADIUS * 2 +
          (this.capacity - 1) * Queue.SPACING,
        leftY,
        Item.RADIUS + Queue.PADDING
      );
      g.drawRect(
        leftX,
        0,
        (this.capacity - 1) * Item.RADIUS * 2 +
          (this.capacity - 1) * Queue.SPACING,
        Item.RADIUS * 2 + Queue.PADDING * 2
      );
      g.lineStyle(0);
      g.drawRect(
        leftX,
        Queue.STROKE_WIDTH,
        (this.capacity - 1) * Item.RADIUS * 2 +
          (this.capacity - 1) * Queue.SPACING,
        Item.RADIUS * 2 + Queue.PADDING * 2 - Queue.STROKE_WIDTH * 2
      );
    } else {
      g.drawCircle(leftX, leftY, Item.RADIUS + Queue.PADDING);
      g.drawCircle(
        leftX,
        leftY +
          (this.capacity - 1) * Item.RADIUS * 2 +
          (this.capacity - 1) * Queue.SPACING,
        Item.RADIUS + Queue.PADDING
      );
      g.drawRect(
        0,
        leftY,
        Item.RADIUS * 2 + Queue.PADDING * 2,
        (this.capacity - 1) * Item.RADIUS * 2 +
          (this.capacity - 1) * Queue.SPACING
      );
      g.lineStyle(0);
      g.drawRect(
        Queue.STROKE_WIDTH,
        leftY,
        Item.RADIUS * 2 + Queue.PADDING * 2 - Queue.STROKE_WIDTH * 2,
        (this.capacity - 1) * Item.RADIUS * 2 +
          (this.capacity - 1) * Queue.SPACING
      );
    }

    g.endFill();
  }

  add(i: Item): boolean {
    if (!i) {
      throw new Error(`invalid item: ${i}`);
    }
    if (i.added) {
      throw new Error(`item already added: ${i}`);
    }
    const added = this._add(i);
    if (added) {
      i.added = performance.now();
      this.application.events.emit("request-queued", i, this);
      for (const waiter of this._waitingForItems) {
        waiter();
      }
      this._waitingForItems = [];
    }
    return added;
  }

  remove(): Item | undefined {
    const item = this._remove();
    if (!item) {
      return undefined;
    }
    if (!item.added) {
      throw new Error(`item not previously added: ${item}`);
    }
    if (item.removed) {
      throw new Error(`item already removed: ${item}`);
    }
    item.removed = performance.now();
    const timeInQueue = item.removed - item.added;
    this._stats[item.priority].add(timeInQueue);
    for (const waiter of this._waitingForSpace) {
      waiter();
    }
    this._waitingForSpace = [];
    return item;
  }

  abstract _add(i: Item): boolean;
  abstract _remove(): Item | undefined;

  protected getSlot(index: number): Container {
    if (index < 0 || index >= this._slots.length) {
      throw new Error(`invalid slot index: ${index}`);
    }
    return this._slots[index];
  }

  protected moveToSlot(i: Item, slot: Container) {
    gsap.killTweensOf(i, "x,y");
    i.animateMoveTo(slot, {
      duration: 0.5,
      ease: "power4.out",
    });
    const startingTint = i.tint;

    this.application
      .timeline()
      .to(i, {
        keyframes: [
          {
            duration: 0.3,
            ease: "power4.out",
            pixi: {
              tint: getColor(2).toNumber(),
            },
          },
          {
            duration: 0.6,
            ease: "power4.out",
            pixi: {
              tint: startingTint,
            },
          },
        ],
      })
      .play();
  }

  waitTimePercentile(priority: Priority, p: number): number {
    const now = performance.now();
    const currentWaits: number[] = [];
    for (const i of this._items) {
      if (!i.added) {
        throw new Error(`item not added: ${i}`);
      }
      const wait = now - i.added;
      currentWaits.push(wait);
    }

    return this._stats[priority].percentile(p);
  }

  getLastSlot(): Container {
    if (this.startFrom === "top" || this.startFrom === "left") {
      return this.getSlot(0);
    } else {
      return this.getSlot(this.capacity - 1);
    }
  }
}

export class FifoQueue extends Queue {
  private _nextSlot: number = 0;

  override _add(i: Item): boolean {
    if (this.shouldDrop(i)) {
      const bounds = this.getQueueBounds();
      const lastSlot = this.getLastSlot();

      i.animateMoveTo(lastSlot, {
        duration: 0.5,
        ease: "power4.out",
        killIf: () => i.getBounds().intersects(bounds),
        onComplete: () => {
          i.drop(this, i.collisionVector(lastSlot), this._elopeOnDrop);
        },
      });

      return false;
    }

    const slot = this.getSlot(this._nextSlot);
    this._items.push(i);
    this._nextSlot++;
    this.moveToSlot(i, slot);
    return true;
  }

  override _remove(): Item | undefined {
    if (this._nextSlot === 0) {
      return undefined;
    }
    const item = this._items.shift()!;
    gsap.killTweensOf(item, "x,y");
    this._nextSlot--;

    for (let i = 0; i < this._items.length; i++) {
      const slot = this.getSlot(i);
      gsap.killTweensOf(this._items[i], "x,y");
      this._items[i].animateMoveTo(slot, {
        duration: 0.5,
        ease: "power4.out",
      });
    }
    return item;
  }
}

export class LifoQueue extends Queue {
  override _add(i: Item): boolean {
    if (this.shouldDrop(i)) {
      const bounds = this.getQueueBounds();
      const lastSlot = this.getLastSlot();

      i.animateMoveTo(lastSlot, {
        duration: 0.5,
        ease: "power4.out",
        killIf: () => i.getBounds().intersects(bounds),
        onComplete: () => {
          i.drop(this, i.collisionVector(lastSlot), this._elopeOnDrop);
        },
      });

      return false;
    }

    const slot = this.getSlot(this._items.length);
    this._items.push(i);
    this.moveToSlot(i, slot);
    return true;
  }

  override _remove(): Item | undefined {
    const i = this._items.pop();
    if (!i) {
      return undefined;
    }
    gsap.killTweensOf(i, "x,y");
    return i;
  }
}

export class PriorityQueue extends Queue {
  override _add(i: Item): boolean {
    if (this.shouldDrop(i)) {
      const bounds = this.getQueueBounds();
      const lastSlot = this.getLastSlot();

      i.animateMoveTo(lastSlot, {
        duration: 0.5,
        ease: "power4.out",
        killIf: () => i.getBounds().intersects(bounds),
        onComplete: () => {
          i.drop(this, i.collisionVector(lastSlot), this._elopeOnDrop);
        },
      });

      return false;
    }

    let position = 0;
    for (const item of this._items) {
      if (i.priority < item.priority) {
        break;
      }
      position++;
    }

    for (let i = this._items.length; i > position; i--) {
      const slot = this.getSlot(i);
      gsap.killTweensOf(this._items[i - 1], "x,y");
      this._items[i - 1].animateMoveTo(slot, {
        duration: 0.5,
        ease: "power4.out",
      });
    }

    const slot = this.getSlot(position);
    this._items.splice(position, 0, i);
    this.moveToSlot(i, slot);
    return true;
  }

  override _remove(): Item | undefined {
    if (this._items.length === 0) {
      return undefined;
    }
    const item = this._items.shift()!;
    gsap.killTweensOf(item, "x,y");

    for (let i = 0; i < this._items.length; i++) {
      const slot = this.getSlot(i);
      gsap.killTweensOf(this._items[i], "x,y");
      this._items[i].animateMoveTo(slot, {
        duration: 0.5,
        ease: "power4.out",
      });
    }
    return item;
  }
}
