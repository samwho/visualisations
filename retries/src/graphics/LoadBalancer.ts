import { red } from "../core/Colors";
import Graphics from "../core/Graphics";
import Request from "./Request";
import Response from "./Response";
import Handler from "../utils/Handler";
import { TrafficSimulation } from "../applications/TrafficSimulation";
import * as PIXI from "pixi.js";

export default class LoadBalancer
  extends Graphics<TrafficSimulation>
  implements Handler
{
  size: number;
  hostname: string;
  healthCheckInterval: number = 1000;

  _servers: (Handler & PIXI.Graphics)[] = [];
  _serverIndex: number = 0;

  constructor({
    application,
    hostname,
  }: {
    application: TrafficSimulation;
    hostname: string;
  }) {
    super(application);
    this.size = 100;
    this.hostname = hostname;
    this.zIndex = 0;
    this.pivot.x = this.size / 2;
    this.pivot.y = this.size / 2;

    this.beginFill(0x000000);
    this.drawRoundedRect(0, 0, this.size, this.size, this.size / 4);
    this.endFill();

    this.healthCheck();
    this.application.setInterval(
      () => this.healthCheck(),
      this.healthCheckInterval
    );
  }

  isHealthy(): boolean {
    return true;
  }

  healthCheck() {
    let servers = this.application.dns.resolve(this.hostname);
    if (!servers) {
      return;
    }
    this._servers = servers.filter((server) => server.isHealthy());
  }

  pickServer(): (Handler & PIXI.Graphics) | null {
    if (this._servers.length == 0) {
      return null;
    }

    this._serverIndex = (this._serverIndex + 1) % this._servers.length;
    return this._servers[this._serverIndex];
  }

  async handle(request: Request): Promise<Response> {
    let server = this.pickServer();
    while (server && server.destroyed) {
      server = this.pickServer();
    }

    if (server === null) {
      request.tint = red;
      request.changeToStar();
      await request.animateMoveTo(request.client);
      request.destroy();
      return new Response({ request, status: 503 });
    }

    request.target = server;
    await request.animateMoveTo(server);

    var response: Response | null = null;
    try {
      response = await server.handle(request);
    } catch (e) {
      response = new Response({ request, status: 503 });
      request.tint = red;
    }
    request.moveToObject(this);
    request.target = request.client;
    await request.animateMoveTo(request.client);
    request.destroy();
    return response;
  }
}
