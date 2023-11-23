import { IDestroyOptions, Point } from "pixi.js-legacy";
import { green, red } from "../core/Colors";
import Graphics from "../core/Graphics";
import Request from "./Request";
import Response from "./Response";
import Color from "color";
import { Power4 } from "gsap";
import Handler from "../utils/Handler";
import { TrafficSimulation } from "../applications/TrafficSimulation";

export default class Server
  extends Graphics<TrafficSimulation>
  implements Handler
{
  failureRate: number;
  size: number;
  requestsInProgress: Request[] = [];
  maxRequestsInProgress: number = 5;
  recoveryTime: number = 10;
  overloaded: boolean = false;

  _square: Graphics<TrafficSimulation>;

  constructor({
    application,
    failureRate,
  }: {
    application: TrafficSimulation;
    failureRate?: number;
  }) {
    super(application);
    this.size = 100;
    this.zIndex = 1;
    this.failureRate = failureRate || 0;

    let hidden = new Graphics(this.application);
    hidden.pivot.x = this.size / 2;
    hidden.pivot.y = this.size / 2;
    hidden.beginFill(0xffffff);
    hidden.drawRoundedRect(0, 0, this.size - 2, this.size - 2, this.size / 4);
    hidden.endFill();
    hidden.alpha = 0.01;
    this.addChild(hidden);

    this._square = new Graphics(this.application);
    this._square.pivot.x = this.size / 2;
    this._square.pivot.y = this.size / 2;
    this._square.beginFill(0xffffff);
    this._square.drawRoundedRect(
      0,
      0,
      this.size - 2,
      this.size - 2,
      this.size / 4
    );
    this._square.endFill();
    this._square.tint = green;
    this.addChild(this._square);
  }

  repositionRequests() {
    let thisGlobal = this.toGlobal(new Point(this.x, this.y));
    for (let request of this.requestsInProgress) {
      if (!request.transform || !this.transform) {
        continue;
      }
      request.x = thisGlobal.x;
      request.y = thisGlobal.y;
    }
  }

  isHealthy(): boolean {
    return !this.overloaded;
  }

  loadColor(): number {
    let factor = this.requestsInProgress.length / this.maxRequestsInProgress;

    let hslColor1 = Color(green).hsl();
    let hslColor2 = Color(red).hsl();

    let hslResult = [
      hslColor1.hue() + factor * (hslColor2.hue() - hslColor1.hue()),
      hslColor1.saturationl() +
        factor * (hslColor2.saturationl() - hslColor1.saturationl()),
      hslColor1.lightness() +
        factor * (hslColor2.lightness() - hslColor1.lightness()),
    ];

    return Color.hsl(hslResult).rgbNumber();
  }

  async handle(request: Request): Promise<Response> {
    if (this.overloaded) {
      let globalOrigin = request.origin.parent.toGlobal(
        request.origin.position
      );
      let globalCurrent = request.parent.toGlobal(request.position);

      let angle = ((Math.random() * 60 - 30) * Math.PI) / 180;
      let direction = new Point(
        globalCurrent.x - globalOrigin.x,
        globalCurrent.y - globalOrigin.y
      );
      direction.x =
        Math.cos(angle) * direction.x - Math.sin(angle) * direction.y;
      direction.y =
        Math.sin(angle) * direction.x + Math.cos(angle) * direction.y;

      let tl = this.application.timeline();
      let requestClone = request.clone();
      request.parent.addChild(requestClone);
      requestClone.tint = red;
      requestClone.x = request.x;
      requestClone.y = request.y;
      tl.to(requestClone, {
        duration: 2,
        ease: Power4.easeOut,
        pixi: {
          x: request.x + direction.x / 4,
          y: request.y + direction.y / 4,
          alpha: 0,
        },
        onComplete: () => {
          requestClone.destroy();
        },
      });
      tl.play();
      throw new Error("overloaded");
    }

    this.requestsInProgress.push(request);
    this._square.tint = this.loadColor();

    if (this.requestsInProgress.length >= this.maxRequestsInProgress) {
      this.overloaded = true;

      for (let request of this.requestsInProgress) {
        let randomAngle = Math.random() * 2 * Math.PI;
        let randomDirection = new Point(
          Math.cos(randomAngle),
          Math.sin(randomAngle)
        );

        let tl = this.application.timeline();
        let requestClone = request.clone();
        request.parent.addChild(requestClone);
        requestClone.tint = red;
        requestClone.changeToStar();
        requestClone.x = request.x;
        requestClone.y = request.y;
        tl.to(requestClone, {
          duration: 2,
          ease: Power4.easeOut,
          pixi: {
            x: request.x + randomDirection.x * 100,
            y: request.y + randomDirection.y * 100,
            alpha: 0,
          },
          onComplete: () => {
            requestClone.destroy();
          },
        });
        tl.play();

        request.removeFromParent();
      }

      this.requestsInProgress = [];

      let tl = this.application.timeline();
      tl.to(this._square, {
        duration: 1,
        ease: Power4.easeOut,
        pixi: {
          tint: 0x777777,
          scale: 0.5,
        },
      });
      tl.to(this._square, {
        duration: 4,
        ease: Power4.easeIn,
        pixi: {
          tint: green,
          scale: 1,
        },
        onComplete: () => {
          this.overloaded = false;
        },
      });
      tl.play();

      throw new Error("overloaded");
    }

    await this.application.sleep(request.cost);

    if (this.destroyed) {
      throw new Error("server destroyed");
    }

    if (request.destroyed) {
      throw new Error("request destroyed");
    }

    let status = Math.random() < this.failureRate ? 500 : 200;
    let response = new Response({ request, status });

    let requestIndex = this.requestsInProgress.indexOf(request);
    if (requestIndex === -1) {
      throw new Error("request dropped");
    }

    this.requestsInProgress.splice(requestIndex, 1);
    this._square.tint = this.loadColor();

    if (status === 200) {
      request.tint = green;
    } else {
      request.tint = red;
      request.changeToStar();
    }
    await request.animateMoveTo(request.origin);
    return response;
  }

  destroy(options?: boolean | IDestroyOptions | undefined): void {
    super.destroy(options);
    (this.application.stage as any).off("servers-added");
    (this.application.stage as any).off("servers-removed");

    for (let request of this.requestsInProgress) {
      if (!request.destroyed) {
        request.destroy();
      }
    }
  }
}
