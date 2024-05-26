import {
  BitmapText,
  ColorSource,
  Resource,
  Sprite,
  Texture,
} from "pixi.js-legacy";
import { Graphics } from "../core/Graphics";
import { getColor } from "../core/Colors";
import { Item } from "./Item";
import { Icons } from "../core/Icons";
import { LayoutSize } from "pixijs-layout";
import { Fonts } from "../core/Fonts";
import { isTouchDevice, prefersReducedMotion } from "../core/Accessibility";
import { GlobalEvents } from "../core/GlobalEvents";

export class Button extends Graphics implements LayoutSize {
  protected shadow: Graphics;
  protected top: Graphics;

  private _state: "idle" | "hover" | "press" = "idle";
  private _onClickHandlers: (() => void)[] = [];
  private _text?: BitmapText;
  private _pointer?: Sprite;
  private _timeline?: gsap.core.Timeline;

  constructor(
    opts?: {
      color?: ColorSource;
      texture?: Texture<Resource>;
      showPointer?: boolean;
      handedness?: "left" | "right";
    },
    ...args: ConstructorParameters<typeof Graphics>
  ) {
    super(...args);

    this.eventMode = "static";
    this.interactiveChildren = true;

    const { color = getColor(0) } = opts || {};

    this.shadow = new Graphics(this.application);
    this.addChild(this.shadow);

    if (opts?.texture) {
      this.shadow.beginTextureFill({ texture: opts.texture });
      this.shadow.lineStyle(2, 0xffffff, 1, 0);
    } else {
      this.shadow.beginFill(0xffffff);
    }
    this.shadow.tint = 0x333333;
    this.shadow.drawCircle(0, 0, Item.RADIUS);
    this.shadow.endFill();

    this.top = new Graphics(this.application);
    this.top.tint = color;
    this.addChild(this.top);

    if (opts?.texture) {
      this.top.beginTextureFill({ texture: opts.texture });
      this.top.lineStyle(2, 0xffffff, 1, 0);
    } else {
      this.top.beginFill(0xffffff);
    }

    this.top.drawCircle(0, 0, Item.RADIUS);
    this.top.endFill();

    this.top.cursor = "pointer";
    this.top.eventMode = "static";
    this.top.hitArea = this.top.getBounds();

    if (opts?.showPointer) {
      this._pointer = Icons.pointer({
        width: Item.RADIUS * 4,
        height: Item.RADIUS * 4,
      });
      this._pointer.eventMode = "static";
      this._pointer.width = Item.RADIUS * 1.5;
      this._pointer.height = Item.RADIUS * 1.5;
      this._pointer.pivot.set(
        this._pointer.width / 2,
        this._pointer.height / 2
      );
      this.positionPointer(opts?.handedness || "left");
      this._pointer.cursor = "pointer";

      const passthroughEvents = [
        "pointerdown",
        "pointerup",
        "pointerupoutside",
        "pointerupoutsidecapture",
        "pointerenter",
        "pointerleave",
      ];
      for (const event of passthroughEvents) {
        this._pointer.on(event, (e) => {
          this.top.dispatchEvent(e);
        });
      }

      this.addChild(this._pointer);

      let word = "click";
      if (isTouchDevice()) {
        word = "tap";
      }

      this._text = Fonts.createBitmapText(word, { tint: 0x000000 });
      this._text.scale.set(0.4);
      this.positionText(opts?.handedness || "left");
      this.addChild(this._text);

      GlobalEvents.onHandednessChange((handedness) => {
        this.positionText(handedness);
        this.positionPointer(handedness);
      });

      const f = () => {
        this._timeline?.kill();
        this._pointer?.destroy();
        this._text?.destroy();
        this.removeOnClick(f);
      };
      this.onClick(f);
    }

    this.idle();

    this.top.on("pointerenter", (e) => {
      e.preventDefault();
      if (this.isPressed()) return;
      this.hover();
      this._state = "hover";
    });
    this.top.on("pointerleave", (e) => {
      e.preventDefault();
      if (this.isPressed()) return;
      this.idle();
      this._state = "idle";
    });
    this.top.on("pointerup", (e) => {
      e.preventDefault();
      this.hover();
      this._state = "hover";
      this.invokeOnClickHandlers();
    });
    this.top.on("pointerupoutside", (e) => {
      e.preventDefault();
      this.idle();
      this._state = "idle";
    });
    this.top.on("pointerupoutsidecapture", (e) => {
      e.preventDefault();
      this.idle();
      this._state = "idle";
    });
    this.top.on("pointerdown", (e) => {
      e.preventDefault();
      this.press();
      this._state = "press";
    });
  }

  private positionText(handedness: "left" | "right") {
    if (!this._text) return;

    if (handedness === "left") {
      this._text.x = this.top.x + this.top.width;
      this._text.y = this.top.y - this._text.height / 2;
    } else {
      this._text.x = this.top.x - this.top.width - this._text.width;
      this._text.y = this.top.y - this._text.height / 2;
    }
  }

  private positionPointer(handedness: "left" | "right") {
    if (!this._pointer) return;

    if (handedness === "left") {
      this._pointer.x = Item.RADIUS / 4;
      // this._pointer.scale.x *= -1;
    } else {
      this._pointer.x = -Item.RADIUS / 4;
      this._pointer.scale.x *= -1;
    }

    if (!prefersReducedMotion()) {
      this._timeline?.kill();
      this._timeline = this.application.timeline();
      this._timeline.to(this._pointer, {
        pixi: { x: this._pointer.x + 5 },
        duration: 0.5,
        ease: "power1.inOut",
        yoyo: true,
        repeat: -1,
      });
      this._timeline.play();
    }
  }

  getLayoutWidth(): number {
    return Item.RADIUS * 2 + Item.RADIUS / 8;
  }
  getLayoutHeight(): number {
    return Item.RADIUS * 2 + Item.RADIUS / 8;
  }

  idle() {
    this.top.position.set(-Item.RADIUS / 8, -Item.RADIUS / 8);
    this.application.ticker.update();
  }

  hover() {
    this.top.position.set(-Item.RADIUS / 10, -Item.RADIUS / 10);
    this.application.ticker.update();
  }

  press() {
    this.top.position.set(-1, -1);
    this.application.ticker.update();
  }

  isPressed() {
    return this._state === "press";
  }

  onClick(handler: () => void) {
    this._onClickHandlers.push(handler);
  }

  removeOnClick(handler: () => void) {
    this._onClickHandlers = this._onClickHandlers.filter((h) => h !== handler);
  }

  private invokeOnClickHandlers() {
    for (const handler of this._onClickHandlers) {
      handler();
    }
  }
}
