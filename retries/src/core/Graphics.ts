import * as PIXI from "pixi.js-legacy";
import Application from "./Application";
import { Container } from "pixi.js-legacy";

export default class Graphics<T extends Application> extends PIXI.Graphics {
  application: T;

  constructor(
    application: T,
    ...opts: ConstructorParameters<typeof PIXI.Graphics>
  ) {
    super(...opts);
    this.application = application;
  }

  distanceTo(other: Container): number {
    let from = this.parent.toGlobal(this.position);
    let to = other.parent.toGlobal(other.position);
    return Math.sqrt(Math.pow(from.x - to.x, 2) + Math.pow(from.y - to.y, 2));
  }

  animateMoveTo(to: Container, vars?: gsap.TweenVars): Promise<void> {
    return new Promise<void>((resolve) => {
      let tl = this.application.timeline();

      let animationVars = {
        duration: () => {
          if ("speed" in this && typeof this["speed"] === "number") {
            return this.distanceTo(to) / this["speed"];
          }
          return 1;
        },
        ease: "none",
        pixi: {
          x: () => this.parent.toLocal(to.parent.toGlobal(to.position)).x,
          y: () => this.parent.toLocal(to.parent.toGlobal(to.position)).y,
        },
        onComplete: () => {
          resolve();
        },
      };

      window.addEventListener("resize", () => {
        tl.invalidate();
      });

      tl.to(this, { ...animationVars, ...vars } as any);
      tl.play();
    });
  }

  moveToObject(to: Container): void {
    var destination = this.parent.toLocal(to.parent.toGlobal(to.position));
    this.x = destination.x;
    this.y = destination.y;
  }
}
