import { IDestroyOptions } from "pixi.js-legacy";
import { blue } from "../core/Colors";
import Graphics from "../core/Graphics";
import Client from "./Client";
import Response from "./Response";
import Handler from "../utils/Handler";
import { TrafficSimulation } from "../applications/TrafficSimulation";
import * as PIXI from "pixi.js-legacy";
import { randBetween } from "../core/Utils";

export default class Request extends Graphics<TrafficSimulation> {
  client: Client;
  target: PIXI.Graphics | null = null;
  size: number;
  cost: number;

  handlers: (Handler & PIXI.Graphics)[] = [];

  get speed(): number {
    return this.application["requestSpeed"];
  }

  constructor({ client }: { client: Client }) {
    super(client.application);
    client.application.stage.addChild(this);
    this.moveToObject(client);
    this.size = 25;
    this.client = client;
    this.zIndex = 10;
    this.tint = blue;
    this.cost = randBetween(500, 1000);

    this.beginFill(0xffffff);
    this.drawCircle(0, 0, this.size / 2);
    this.endFill();
  }

  changeToStar() {
    this.clear();
    this.beginFill(0xffffff);

    let cx = 0,
      cy = 0,
      spikes = 20,
      outerRadius = 15,
      innerRadius = 12;

    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    this.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      this.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      this.lineTo(x, y);
      rot += step;
    }

    this.lineTo(cx, cy - outerRadius);
    this.closePath();
    this.endFill();
  }

  get origin(): PIXI.Graphics {
    if (this.handlers.length === 0) {
      return this.client;
    }
    return this.handlers[this.handlers.length - 1];
  }

  async send(target: Handler & PIXI.Graphics): Promise<Response> {
    this.target = target;

    this.handlers.push(target);
    await this.animateMoveTo(target);
    try {
      return await target.handle(this);
    } finally {
      this.handlers.pop();
    }
  }

  destroy(options?: boolean | IDestroyOptions | undefined): void {
    if (this.parent) {
      this.removeFromParent();
    }
    super.destroy(options);
  }

  clone(): Request {
    return new Request({ client: this.client });
  }
}
