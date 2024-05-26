import {
  Graphics as PIXIGraphics,
  Container,
  Point,
  TickerCallback,
  Ticker,
} from "pixi.js-legacy";
import { Application } from "./Application";
import { Angle, Vec2, randBetween } from "./Maths";

export interface TweenVars extends gsap.TweenVars {
  killIf?: () => boolean;
}
export class Graphics extends PIXIGraphics {
  application: Application;

  constructor(
    application: Application,
    ...opts: ConstructorParameters<typeof PIXIGraphics>
  ) {
    super(...opts);
    this.application = application;
    this.interactiveChildren = false;
  }

  distanceTo(other: Container): number {
    let from = this.parent.toGlobal(this.position);
    let to = other.parent.toGlobal(other.position);
    return Math.sqrt(Math.pow(from.x - to.x, 2) + Math.pow(from.y - to.y, 2));
  }

  globalPosition(): Point {
    if (!this.parent) {
      throw new Error("attempted to get global position without a parent");
    }
    return this.parent.toGlobal(this.position);
  }

  animateMoveTo(to: Container, vars?: TweenVars): Promise<void> {
    return new Promise<void>((resolve) => {
      let tl = this.application.timeline();

      const resizeObserver = new ResizeObserver(() => {
        tl.invalidate();
      });

      const killIf = vars?.killIf;
      delete vars?.killIf;

      let animationVars: gsap.TweenVars = {
        ...vars,
        // @ts-ignore
        duration: () => {
          if (vars?.duration) {
            return vars.duration;
          }
          if ("speed" in this && typeof this["speed"] === "number") {
            return this.distanceTo(to) / this["speed"];
          }
          return 1;
        },
        ease: vars?.ease || "none",
        pixi: {
          ...vars?.pixi,
          // @ts-ignore
          x: () => this.parent.toLocal(to.parent.toGlobal(to.position)).x,
          // @ts-ignore
          y: () => this.parent.toLocal(to.parent.toGlobal(to.position)).y,
        },
        onStart: () => {
          resizeObserver.observe(this.application.element);
          vars?.onStart?.();
        },
        onComplete: () => {
          resizeObserver.disconnect();
          vars?.onComplete?.();
          resolve();
        },
        onUpdate: () => {
          vars?.onUpdate?.();
          if (killIf && killIf()) {
            tl.kill();
            vars?.onComplete?.();
            resolve();
          }
        },
      };

      tl.to(this, animationVars);
      tl.play();
    });
  }

  adopt(object: Container, opts?: { at?: number }): void {
    if (object.parent) {
      const scaleRatioX = object.parent.scale.x / this.scale.x;
      const scaleRatioY = object.parent.scale.y / this.scale.y;
      object.scale.x *= scaleRatioX;
      object.scale.y *= scaleRatioY;
    }

    const pos = object.getGlobalPosition();
    object.removeFromParent();
    if (opts?.at !== undefined) {
      this.addChildAt(object, opts.at);
    } else {
      this.addChild(object);
    }
    const local = this.toLocal(pos);
    object.position.set(local.x, local.y);
  }

  elope(object: Container, opts?: { at?: number }): void {
    if (this.parent) {
      const scaleRatioX = this.parent.scale.x / object.scale.x;
      const scaleRatioY = this.parent.scale.y / object.scale.y;
      this.scale.x *= scaleRatioX;
      this.scale.y *= scaleRatioY;
    }

    const pos = this.getGlobalPosition();
    this.removeFromParent();
    if (opts?.at !== undefined) {
      object.addChildAt(this, opts.at);
    } else {
      object.addChild(this);
    }
    const local = object.toLocal(pos);
    this.position.set(local.x, local.y);
  }

  moveToObject(to: Container): void {
    var destination = this.parent.toLocal(to.parent.toGlobal(to.position));
    this.x = destination.x;
    this.y = destination.y;
  }

  physicsTakeTheWheel(
    velocity: Vec2,
    opts: { gravity?: number; elope?: boolean } = {},
    destroyCallback?: () => void
  ) {
    const { gravity = 0.98, elope } = opts;

    if (elope) {
      this.elope(this.application.stage);
    }

    // This is a hack to get around the code we have in place to pause the
    // global GSAP timer when nothing is happening. Because we're doing this
    // animation on the ticker, we need to make sure _something_ is happening in
    // GSAP to avoid it pausing. This is because we tie all of our PixiJS
    // animations to the global GSAP ticker in the Application class.
    const tl = this.application.timeline();
    tl.to(this, {
      pixi: { alpha: 0 },
      duration: 1000,
      repeat: -1,
    });
    tl.play();

    const f: TickerCallback<Ticker> = (delta) => {
      this.position.x += velocity.x * delta;
      this.position.y += velocity.y * delta;
      velocity.y += gravity * delta;

      if (this.position.y > this.application.screen.height + this.height) {
        tl.kill();
        this.application.ticker.remove(f);

        if (destroyCallback) {
          destroyCallback();
        } else {
          this.destroy();
        }
      }
    };
    this.application.ticker.add(f);
  }

  collisionVector(
    other: Container,
    opts: { cone?: Angle; power?: number; powerVariance?: number } = {}
  ): Vec2 {
    const { cone = Angle.degrees(60), power = 8, powerVariance = 2 } = opts;
    return Vec2.between(this.position, other.position)
      .normalize()
      .rotate(Angle.degrees(randBetween(-cone.degrees, cone.degrees)))
      .scale(randBetween(power - powerVariance, power + powerVariance));
  }
}
