import {
  ColorSource,
  IDestroyOptions,
  LINE_JOIN,
  Texture,
} from "pixi.js-legacy";
import { Graphics } from "../core/Graphics";
import { getColor } from "../core/Colors";
import { Angle, Vec2 } from "../core/Maths";
import { Duration } from "../core/Duration";
import { Textures } from "../core/Textures";
import { Server } from "./Server";
import { Queue } from "./Queue";
import { GlobalEvents } from "../core/GlobalEvents";

export enum Priority {
  HIGH = 0,
  LOW = 1,
}

export class Item extends Graphics {
  static RADIUS = 25;
  static MAX_COST = 100;
  static STROKE_WIDTH = 2;

  id: string;
  created: number;
  added?: number;
  removed?: number;
  dropped?: number;
  processed?: number;

  priority: Priority;
  timedOut = false;

  private _cost: number;
  private _texture?: Texture;
  private _timeout?: number;
  private _strokeWidth = 0;

  private outerCircle: Graphics;
  private innerCircle: Graphics;
  private innerCircle2: Graphics;
  private _innerCircleMask: Graphics;
  private _timeoutTimeline?: gsap.core.Timeline;

  constructor(
    {
      cost,
      texture,
      timeout,
      priority,
    }: {
      cost?: number;
      texture?: Texture;
      timeout?: Duration;
      priority?: Priority;
    } = {},
    ...args: ConstructorParameters<typeof Graphics>
  ) {
    super(...args);
    this.id = crypto.randomUUID();
    this._strokeWidth = Item.STROKE_WIDTH;

    this.outerCircle = new Graphics(this.application);
    this.addChild(this.outerCircle);

    this.innerCircle2 = new Graphics(this.application);
    this.innerCircle2.alpha = 0.5;
    this.outerCircle.addChild(this.innerCircle2);

    this.innerCircle = new Graphics(this.application);
    this.outerCircle.addChild(this.innerCircle);

    this._innerCircleMask = new Graphics(this.application);
    this._innerCircleMask.beginFill(0xffffff);
    this._innerCircleMask.drawRect(
      -Item.RADIUS - this._strokeWidth / 2,
      -Item.RADIUS - this._strokeWidth / 2,
      (Item.RADIUS - this._strokeWidth / 2) * 2,
      (Item.RADIUS - this._strokeWidth / 2) * 2
    );
    this._innerCircleMask.endFill();
    this._innerCircleMask.x = this._strokeWidth / 2;
    this._innerCircleMask.y = this._strokeWidth / 2;
    this.innerCircle.mask = this._innerCircleMask;
    this.outerCircle.addChild(this._innerCircleMask);

    this._cost = cost !== undefined ? cost : Item.MAX_COST;
    this._texture = texture;
    this.priority = priority === undefined ? Priority.LOW : priority;
    this.tint = priority === 0 ? getColor(3) : getColor(0);
    this.created = performance.now();

    if (this._texture === undefined && this.priority === 0) {
      this._texture = Textures.verticalStripes(this.application, 1);
    }

    if (timeout !== undefined) {
      this._timeoutTimeline = this.application
        .timeline()
        .to(this._innerCircleMask, {
          pixi: { y: (Item.RADIUS - this._strokeWidth) * 2 },
          duration: timeout.seconds,
          ease: "none",
        })
        .play();

      this._timeout = this.application.setTimeout(() => {
        this.timedOut = true;
        this.draw();
        this.application.events.emit("request-timeout", this);
      }, timeout.ms);
    }

    this.draw();
    this.application.events.emit("request-created", this);
  }

  set tint(value: ColorSource) {
    this.outerCircle.tint = value;
    this.innerCircle.tint = value;
    this.innerCircle2.tint = value;
  }

  get tint(): ColorSource {
    return this.outerCircle.tint;
  }

  drop(by: Queue | Server, collisionVector: Vec2, elope?: boolean) {
    this.dropped = performance.now();
    this.cancelTimeout();
    this.outerCircle.tint = 0xff0000;
    this.innerCircle.tint = 0xff0000;
    this.physicsTakeTheWheel(collisionVector, { elope }, () => {
      GlobalEvents.emitRequestGraveyard(this);
    });
    this.application.events.emit("request-dropped", this, by);
  }

  isLowPriority(): boolean {
    return this.priority === Priority.LOW;
  }

  isHighPriority(): boolean {
    return this.priority === Priority.HIGH;
  }

  draw() {
    this.outerCircle.clear();
    this.innerCircle.clear();
    this.innerCircle2.clear();

    if (this._strokeWidth > 0) {
      this.outerCircle.lineStyle({
        width: this._strokeWidth,
        color: 0xffffff,
        join: LINE_JOIN.ROUND,
      });
    }

    if (this.timedOut) {
      // do nothing
    } else if (this._texture) {
      this.innerCircle.beginTextureFill({
        texture: this._texture,
        color: 0xffffff,
      });
      this.innerCircle2.beginTextureFill({
        texture: this._texture,
        color: 0xffffff,
      });
    } else {
      this.innerCircle.beginFill(0xffffff);
      this.innerCircle2.beginFill(0xffffff);
    }

    if (this.cost === Item.MAX_COST) {
      this.outerCircle.drawCircle(0, 0, Item.RADIUS - this._strokeWidth);
      this.outerCircle.endFill();
      this.innerCircle.drawCircle(0, 0, Item.RADIUS - this._strokeWidth);
      this.innerCircle.endFill();
      this.innerCircle2.drawCircle(0, 0, Item.RADIUS - this._strokeWidth);
      this.innerCircle2.endFill();
      return;
    }

    const offset = Angle.degrees(-90);
    let angle = Angle.degrees(360 * (this.cost / Item.MAX_COST)).rotate(offset);

    this.outerCircle.moveTo(0, 0);
    this.outerCircle.arc(
      0,
      0,
      Item.RADIUS - this._strokeWidth,
      offset.radians,
      angle.radians
    );
    this.outerCircle.closePath();
    this.outerCircle.endFill();

    this.innerCircle.moveTo(0, 0);
    this.innerCircle.arc(
      0,
      0,
      Item.RADIUS - this._strokeWidth,
      offset.radians,
      angle.radians
    );
    this.innerCircle.closePath();
    this.innerCircle.endFill();

    this.innerCircle2.moveTo(0, 0);
    this.innerCircle2.arc(
      0,
      0,
      Item.RADIUS - this._strokeWidth,
      offset.radians,
      angle.radians
    );
    this.innerCircle2.closePath();
    this.innerCircle2.endFill();
  }

  isDropped(): boolean {
    return this.dropped !== undefined;
  }

  isProcessed(): boolean {
    return this.processed !== undefined;
  }

  queuedTime(): Duration | undefined {
    if (!this.added) {
      return undefined;
    }
    return Duration.ms(this.added! - this.created);
  }

  totalTime(): Duration | undefined {
    if (!this.processed && !this.dropped) {
      return undefined;
    }
    return Duration.ms((this.processed! || this.dropped!) - this.created);
  }

  set cost(value: number) {
    this._cost = Math.max(0, Math.min(value, Item.MAX_COST));
    this.draw();
  }

  get cost(): number {
    return this._cost;
  }

  cancelTimeout() {
    if (this._timeout !== undefined) {
      this._timeoutTimeline?.kill();
      this.application.clearTimeout(this._timeout);
      this._timeout = undefined;
    }
  }

  destroy(options?: boolean | IDestroyOptions | undefined): void {
    this.cancelTimeout();
    super.destroy(options);
  }
}
