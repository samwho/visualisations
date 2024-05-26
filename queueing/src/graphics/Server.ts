import { ColorSource, Texture, Ticker, TickerCallback } from "pixi.js-legacy";
import { Graphics } from "../core/Graphics";
import { Angle } from "../core/Maths";
import { LayoutSize } from "pixijs-layout";
import { Item } from "./Item";
import gsap from "gsap";

export class Server extends Graphics implements LayoutSize {
  static MAX_POWER: number = 100;

  power: number;
  private _texture?: Texture;
  private _processing: Item | null = null;
  private _layoutWidth: number;
  private _layoutHeight: number;
  private _graphics: Graphics;

  constructor(
    {
      texture,
      tint,
      power,
    }: { texture?: Texture; tint?: ColorSource; power?: number } = {},
    ...args: ConstructorParameters<typeof Graphics>
  ) {
    super(...args);

    this._graphics = new Graphics(this.application);
    this.addChild(this._graphics);

    this._graphics.tint = tint ?? 0x000000;
    this._texture = texture;
    this.power = power ?? Server.MAX_POWER;

    if (this._texture) {
      this._graphics.beginTextureFill({
        texture: this._texture,
        color: 0xffffff,
      });
    } else {
      this._graphics.beginFill(0xffffff);
    }

    this._layoutWidth = Item.RADIUS * 2.5;
    this._layoutHeight = Item.RADIUS * 2.5;

    this._graphics.lineStyle(2, 0xffffff);
    this._graphics.drawRoundedRect(
      0,
      0,
      this._layoutWidth,
      this._layoutHeight,
      this._layoutWidth / 4
    );
    this._graphics.endFill();

    this.pivot.set(this._layoutWidth / 2, this._layoutHeight / 2);
  }

  getLayoutWidth(): number {
    return this._layoutWidth;
  }

  getLayoutHeight(): number {
    return this._layoutHeight;
  }

  isBusy(): boolean {
    return this._processing !== null;
  }

  async process(item: Item, noQueue: boolean = false): Promise<boolean> {
    gsap.killTweensOf(this, "x,y");

    const bounds = this._graphics.getBounds();

    if (noQueue) {
      this.adopt(item, { at: 0 });
    }

    await item.animateMoveTo(this, {
      duration: 0.75,
      ease: "power4.out",
      killIf: () => {
        if (!item.getBounds().intersects(bounds)) return false;
        if (this._processing && this._processing !== item) return true;
        if (this._processing === null) {
          this._processing = item;
          if (noQueue) {
            this.adopt(item);
          }
        }
        return false;
      },
    });

    if (this._processing && this._processing !== item) {
      let velocity = this.collisionVector(item, { cone: Angle.degrees(45) });
      item.drop(this, velocity);
      return false;
    }

    this._processing = item;
    this.adopt(item);

    await new Promise<void>((resolve) => {
      const tl = this.application.timeline();
      tl.to(this, {
        pixi: { alpha: 0 },
        duration: 1000,
        repeat: -1,
      });
      tl.play();

      const f: TickerCallback<Ticker> = (delta) => {
        item.cost -=
          (this.power * gsap.globalTimeline.timeScale() * delta) / 40;
        if (item.cost <= 0) {
          tl.kill();
          this.application.ticker.remove(f);
          resolve();
        }
      };
      this.application.ticker.add(f);
    });

    this._processing = null;
    item.processed = performance.now();
    this.application.events.emit("request-served", item, this);

    item.destroy();
    return true;
  }
}
