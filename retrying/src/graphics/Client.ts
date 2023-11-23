import { purple } from "../core/Colors";
import Graphics from "../core/Graphics";
import Request from "./Request";
import { RetryStrategy } from "../utils/Retry";
import { randBetween } from "../core/Utils";
import { TrafficSimulation } from "../applications/TrafficSimulation";
import Duration from "../utils/Duration";
import * as PIXI from "pixi.js-legacy";

export default class Client extends Graphics<TrafficSimulation> {
  size: number;
  hostname: string;
  retryStrategy: RetryStrategy;
  currentRequest: Request | null = null;

  minWaitBetweenRequests: number;
  maxWaitBetweenRequests: number;
  initialDelay: number | null;

  _circle: Graphics<TrafficSimulation>;

  constructor({
    application,
    hostname,
    retryStrategy,
    minWaitBetweenRequests,
    maxWaitBetweenRequests,
    initialDelay,
  }: {
    application: TrafficSimulation;
    hostname: string;
    retryStrategy: RetryStrategy;
    minWaitBetweenRequests?: number;
    maxWaitBetweenRequests?: number;
    initialDelay?: number;
  }) {
    super(application);
    this.size = 100;
    this.hostname = hostname;
    this.zIndex = 1;
    this.retryStrategy = retryStrategy;
    this.minWaitBetweenRequests = minWaitBetweenRequests || 0;
    this.maxWaitBetweenRequests = maxWaitBetweenRequests || 5000;
    this.initialDelay = initialDelay || null;

    if (this.minWaitBetweenRequests > this.maxWaitBetweenRequests) {
      throw new Error(
        "minWaitBetweenRequests must be less than maxWaitBetweenRequests"
      );
    }

    this._circle = new Graphics(this.application);
    this._circle.beginFill(0xffffff);
    this._circle.drawCircle(0, 0, this.size / 2);
    this._circle.endFill();
    this.addChild(this._circle);

    // This is a hack to ensure that this graphics object always has a
    // consistent width and height. I think without this, when we clear() the
    // circle in the animation, the width and height reset to 0 for a short
    // time. This throws off the fit calculation in the layout.
    let hidden = new Graphics(this.application);
    hidden.beginFill(0xffffff);
    hidden.drawCircle(0, 0, this.size / 2);
    hidden.endFill();
    hidden.alpha = 0.01;
    this.addChild(hidden);

    this.rotation = -Math.PI / 2;

    this.requestLoop();
  }

  async sleep(duration: number | Duration) {
    if (duration instanceof Duration) {
      duration = duration.ms;
    }

    let tl = this.application.timeline();
    tl.to(
      {},
      {
        duration: duration / 1000,
        onStart: () => {
          this._circle.tint = 0xaaaaaa;
        },
        onUpdate: () => {
          let angle = tl.progress() * 360;
          this._circle.clear();
          this._circle.beginFill(0xffffff);
          this._circle.moveTo(0, 0);
          this._circle.arc(0, 0, this.size / 2, 0, PIXI.DEG_TO_RAD * angle);
          this._circle.closePath();
        },
        onComplete: () => {
          this._circle.tint = purple;
          this._circle.beginFill(0xffffff);
          this._circle.drawCircle(0, 0, this.size / 2);
          this._circle.endFill();
        },
      }
    );
    tl.play();

    await this.application.sleep(duration);
  }

  async requestLoop() {
    while (!this.destroyed) {
      if (this.initialDelay) {
        await this.sleep(this.initialDelay);
        this.initialDelay = null;
      } else {
        await this.sleep(
          randBetween(this.minWaitBetweenRequests, this.maxWaitBetweenRequests)
        );
      }

      if (this.destroyed) {
        return;
      }

      let retry = 0;
      for (let sleepFor of this.retryStrategy.retry()) {
        await this.sleep(sleepFor);

        if (this.destroyed) {
          return;
        }

        try {
          let request = new Request({ client: this });
          this.currentRequest = request;

          let targets = this.application.dns.resolve(this.hostname);
          if (!targets || targets.length === 0) {
            throw new Error(`failed to resolve hostname: ${this.hostname}`);
          }
          let target = targets[Math.floor(Math.random() * targets.length)];

          let response = await request.send(target);
          if (response.status === 200) {
            break;
          }
        } catch (e) {
          // console.error(e);
        } finally {
          this.currentRequest = null;
        }

        retry += 1;
      }
    }
  }
}
