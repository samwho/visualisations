import Application from "../core/Application";
import { gsap } from "gsap";
import { one, three, six, seven } from "../core/Colors";
import { Grid, Leaf } from "pixijs-layout";
import { Color, Graphics, Text } from "pixi.js-legacy";
import { HashFunction, Hashers } from "../core/Hashers";
import { customElement, attributeListener } from "../core/Decorators";
import { filterPixiTween } from "../core/Accessibility";

export class BitEvent {
  source: BloomFilter;
  bit: Bit;
}

@customElement("s-bloom-filter")
export default class BloomFilter extends Application {
  bits: Bit[];
  hashes: HashFunction[];
  counting: boolean;
  updateCallbacks: ((e: BitEvent) => void)[] = [];
  highlightCallbacks: ((e: BitEvent) => void)[] = [];
  unhighlightCallbacks: ((e: BitEvent) => void)[] = [];
  checkCallbacks: ((e: BitEvent) => void)[] = [];

  constructor(...args: ConstructorParameters<typeof Application>) {
    super(...args);

    this.stage.interactiveChildren = true;

    let numBits = this.getAttribute("bits", parseInt) || 32;

    this.hashes = ["sha1", "sha256", "sha512"].map(Hashers.get);
    if (this.getAttribute("hashes")) {
      this.hashes = this.getAttribute("hashes")!.split(",").map(Hashers.get);
    }

    this.counting = this.getAttribute("counting", (v) => v === "true") || false;

    this.bits = Array.from(
      { length: numBits },
      (_, index) =>
        new Bit({ application: this, index, counting: this.counting })
    );

    this.registerLayout(
      Leaf(
        Grid(...this.bits).leaves((l) => l.center().fit().padding("5%"))
      ).padding(5)
    );

    for (let elem of this.root.querySelectorAll("add")) {
      this.add(elem.getAttribute("value")!, false);
    }
    this.ticker.update();
  }

  onUpdate(callback: (e: BitEvent) => void) {
    this.updateCallbacks.push(callback);
  }

  onHighlight(callback: (e: BitEvent) => void) {
    this.highlightCallbacks.push(callback);
  }

  onUnhighlight(callback: (e: BitEvent) => void) {
    this.unhighlightCallbacks.push(callback);
  }

  onCheck(callback: (e: BitEvent) => void) {
    this.checkCallbacks.push(callback);
  }

  @attributeListener("highlight")
  onHighlightChange(value: string) {
    this.highlightBit(parseInt(value));
  }

  setBit(bit: number, animate = true, triggerCallbacks = true) {
    this.bits[bit].setBit(animate);

    if (triggerCallbacks) {
      this.updateCallbacks.forEach((cb) =>
        cb({ source: this, bit: this.bits[bit] })
      );
    }
  }

  getBit(bit: number): Bit {
    return this.bits[bit];
  }

  clearBit(bit: number, animate = true, triggerCallbacks = true, full = false) {
    this.bits[bit].clearBit(animate, full);

    if (triggerCallbacks) {
      this.updateCallbacks.forEach((cb) =>
        cb({ source: this, bit: this.bits[bit] })
      );
    }
  }

  highlightBit(bit: number, triggerCallbacks = true) {
    this.bits[bit].highlight();

    if (triggerCallbacks) {
      this.highlightCallbacks.forEach((cb) =>
        cb({ source: this, bit: this.bits[bit] })
      );
    }
  }

  unhighlightBit(bit: number, triggerCallbacks = true) {
    this.bits[bit].unhighlight();

    if (triggerCallbacks) {
      this.unhighlightCallbacks.forEach((cb) =>
        cb({ source: this, bit: this.bits[bit] })
      );
    }
  }

  async temporarilyHighlightBit(bit: number, triggerCallbacks = true) {
    if (triggerCallbacks) {
      this.highlightCallbacks.forEach((cb) =>
        cb({ source: this, bit: this.bits[bit] })
      );
    }

    await this.bits[bit].temporaryHighlight();

    if (triggerCallbacks) {
      this.unhighlightCallbacks.forEach((cb) =>
        cb({ source: this, bit: this.bits[bit] })
      );
    }
  }

  clearAllBits(animate = true, triggerCallbacks = true, full = false) {
    for (const [index, _] of this.bits.entries()) {
      this.clearBit(index, animate, triggerCallbacks, full);
    }
  }

  isSet(bit: number, animate = true, triggerCallbacks = true): boolean {
    if (triggerCallbacks) {
      this.checkCallbacks.forEach((cb) =>
        cb({ source: this, bit: this.bits[bit] })
      );
    }
    return this.bits[bit].isSet(animate);
  }

  add(value: string, animate = true, triggerCallbacks = true) {
    let bits: number[] = [];
    for (let hash of this.hashes) {
      this.setBit(this._hash(hash, value), animate, triggerCallbacks);
      bits.push(this._hash(hash, value));
    }

    if (!animate) {
      this.ticker.update();
    }
  }

  contains(value: string, animate = true): boolean {
    return this.hashes
      .map((hash) => {
        return this.isSet(this._hash(hash, value), animate);
      })
      .every((b) => b);
  }

  remove(value: string, animate = true, triggerCallbacks = true): boolean {
    const bits = this.hashes.map((hash) => this.bits[this._hash(hash, value)]);
    if (bits.some((bit) => !bit.isSet(false))) {
      return false;
    }

    for (let hash of this.hashes) {
      this.clearBit(this._hash(hash, value), animate, triggerCallbacks);
    }

    if (!animate) {
      this.ticker.update();
    }

    return true;
  }

  reset(animate = true, triggerCallbacks = true) {
    this.clearAllBits(animate, triggerCallbacks, true);
    if (!animate) {
      this.ticker.update();
    }
  }

  _hash(fn: HashFunction, value: string): number {
    let hashed = fn(value);
    let count = BigInt(this.bits.length);
    return Number(hashed % count);
  }
}

export class Bit extends Graphics {
  static color: Color = one;
  static setAlpha: number = 1;
  static notSetAlpha: number = 0.3;
  static checkMissColor: Color = six;
  static checkHitColor: Color = three;
  static highlightColor: Color = seven;

  application: BloomFilter;
  size: number;
  index: number;

  _set: boolean;
  _animating: boolean;
  _counting: boolean;
  _count: number;
  _label: Text;

  constructor({
    application,
    index,
    counting,
    size,
  }: {
    application: BloomFilter;
    index: number;
    counting?: boolean;
    size?: number;
  }) {
    super();
    this.application = application;
    this.index = index;

    this._counting = counting || false;
    this._count = 0;
    this._animating = false;
    this._set = false;
    this.alpha = Bit.notSetAlpha;
    this.size = size || 100;

    let radius = this.size / 2;
    this.tint = Bit.color.toHex();

    this.beginFill(0xffffff);
    this.drawCircle(this.x, this.y, radius);
    this.endFill();

    if (this._counting) {
      this._label = new Text("0", {
        fontSize: 48,
        fill: 0x2e3440,
        align: "center",
      });
      this._label.anchor.set(0.5);
      this._label.position.set(this.x, this.y);
      this.addChild(this._label);
    }

    this.eventMode = "static";
    let hovered = false;
    this.on("click", () => {
      if (!this.isSet(false)) return;
      if (hovered) return;
      this.application.temporarilyHighlightBit(this.index);
    });
    this.on("tap", () => {
      if (!this.isSet(false)) return;
      if (hovered) return;
      this.application.temporarilyHighlightBit(this.index);
    });
    this.on("mouseenter", () => {
      if (!this.isSet(false)) return;
      hovered = true;
      this.application.highlightBit(this.index);
    });
    this.on("mouseleave", () => {
      if (!this.isSet(false)) return;
      hovered = false;
      this.application.unhighlightBit(this.index);
    });
  }

  get color(): Color {
    if (this._set) {
      return Bit.color;
    } else {
      const c = new Color(Bit.color.toHex());
      c.setAlpha(Bit.notSetAlpha);
      return c;
    }
  }

  setBit(animate = true) {
    if (animate) {
      for (let tween of gsap.getTweensOf(this)) {
        tween.progress(1);
      }

      let oldScale = this.scale.x;
      let tl = this.application.timeline();
      tl.to(this, {
        ease: "power4.out",
        overwrite: true,
        keyframes: [
          {
            pixi: filterPixiTween({
              tint: Bit.color.toHex(),
              scale: oldScale * 1.2,
            }),
            duration: 0.2,
          },
          {
            pixi: filterPixiTween({
              tint: Bit.color.toHex(),
              alpha: Bit.setAlpha,
              scale: oldScale,
            }),
            duration: 0.3,
          },
        ],
      });
      tl.play();
    } else {
      this.tint = Bit.color.toHex();
      this.alpha = Bit.setAlpha;
    }
    this._set = true;
    if (this._counting) {
      this._count++;
      this._label.text = this._count.toString();
      this._label.style.fill = 0xffffff;
    }
  }

  clearBit(animate = true, full = false) {
    if (this._counting) {
      if (full) {
        this._count = 0;
      } else {
        this._count--;
        if (this._count < 0) {
          this._count = 0;
        }
      }
      if (this._count === 0) {
        this._set = false;
      }
      this._label.text = this._count.toString();
      this._label.style.fill = this._set ? 0xffffff : 0x2e3440;
    } else {
      this._set = false;
    }
    if (animate) {
      for (let tween of gsap.getTweensOf(this)) {
        tween.progress(1);
      }

      let endAlpha = this.isSet(false) ? Bit.setAlpha : Bit.notSetAlpha;
      let tl = this.application.timeline();
      tl.to(this, {
        ease: "power4.out",
        overwrite: true,
        keyframes: [
          { pixi: { tint: Bit.color.toHex(), alpha: endAlpha }, duration: 0.5 },
        ],
      });
      tl.play();
    } else {
      this.tint = Bit.color.toHex();
      this.alpha = Bit.notSetAlpha;
    }
  }

  isSet(animate = true) {
    if (animate) {
      for (let tween of gsap.getTweensOf(this)) {
        tween.progress(1);
      }

      let oldScale = this.scale.x;
      let tl = this.application.timeline();
      tl.to(this, {
        ease: "power4.out",
        overwrite: true,
        keyframes: [
          {
            pixi: filterPixiTween({
              scale: oldScale * 1.2,
              tint: this._set
                ? Bit.checkHitColor.toHex()
                : Bit.checkMissColor.toHex(),
              alpha: Bit.setAlpha,
            }),
            duration: 0.2,
          },
          {
            pixi: filterPixiTween({
              tint: this._set
                ? Bit.checkHitColor.toHex()
                : Bit.checkMissColor.toHex(),
              alpha: Bit.setAlpha,
            }),
            duration: 1,
          },
          {
            pixi: filterPixiTween({
              alpha: this._set ? Bit.setAlpha : Bit.notSetAlpha,
              tint: Bit.color.toHex(),
              scale: oldScale,
            }),
            duration: 0.3,
          },
        ],
      });
      tl.play();
    }
    return this._set;
  }

  highlight() {
    for (let tween of gsap.getTweensOf(this)) {
      tween.progress(1);
    }

    let oldScale = this.scale.x;
    let tl = this.application.timeline();
    tl.to(this, {
      ease: "power4.out",
      overwrite: true,
      keyframes: [
        {
          pixi: filterPixiTween({
            tint: Bit.highlightColor.toHex(),
            scale: oldScale * 1.2,
            alpha: Bit.setAlpha,
          }),
          duration: 0.2,
        },
        {
          pixi: filterPixiTween({
            scale: oldScale,
          }),
          duration: 0.3,
        },
      ],
    });
    tl.play();
  }

  unhighlight() {
    for (let tween of gsap.getTweensOf(this)) {
      tween.progress(1);
    }

    let tl = this.application.timeline();
    tl.to(this, {
      ease: "power4.out",
      overwrite: true,
      keyframes: [
        {
          pixi: filterPixiTween({
            tint: Bit.color.toHex(),
            alpha: this._set ? Bit.setAlpha : Bit.notSetAlpha,
          }),
          duration: 0.5,
        },
      ],
    });
    tl.play();
  }

  temporaryHighlight(): Promise<void> {
    for (let tween of gsap.getTweensOf(this)) {
      tween.progress(1);
    }

    return new Promise<void>((resolve) => {
      let oldScale = this.scale.x;
      let tl = this.application.timeline();
      tl.to(this, {
        ease: "power4.out",
        overwrite: true,
        keyframes: [
          {
            pixi: filterPixiTween({
              tint: Bit.highlightColor.toHex(),
              scale: oldScale * 1.2,
              alpha: Bit.setAlpha,
            }),
            duration: 0.2,
          },
          {
            pixi: filterPixiTween({
              scale: oldScale,
            }),
            duration: 4,
            onComplete: () => {
              resolve();
            },
          },
          {
            pixi: filterPixiTween({
              scale: oldScale,
              tint: Bit.color.toHex(),
              alpha: this._set ? Bit.setAlpha : Bit.notSetAlpha,
            }),
            duration: 0.3,
          },
        ],
      });
      tl.play();
    });
  }
}
