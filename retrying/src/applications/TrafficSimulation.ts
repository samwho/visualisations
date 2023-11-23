import Application from "../core/Application";
import Client from "../graphics/Client";
import LoadBalancer from "../graphics/LoadBalancer";
import Server from "../graphics/Server";
import VStack from "../positioning/VStack";
import Fit from "../positioning/Fit";
import Partitioner from "../positioning/Partitioner";
import Grid from "../positioning/Grid";
import DNS from "../utils/Dns";
import HStack from "../positioning/HStack";
import Request from "../graphics/Request";
import { gsap } from "gsap";
import {
  RetryStrategy,
  RetryStrategyName,
  getStrategyFromApplication,
} from "../utils/Retry";
import GUI from "lil-gui";

export class TrafficSimulation extends Application {
  dns: DNS = new DNS();

  servers: Server[] = [];
  loadBalancers: LoadBalancer[] = [];
  clients: Client[] = [];
  layout: Partitioner | null = null;
  serversContainer: Grid | null = null;

  requestSpeed: number;
  minWaitBetweenRequests: number;
  maxWaitBetweenRequests: number;

  retryDebug: GUI | null = null;
  _retryStrategy: RetryStrategy;
  _failureRate: number;

  constructor({ root, element }: { root: HTMLElement; element: HTMLElement }) {
    super({ root, element });

    this.stage.sortableChildren = true;

    this.requestSpeed =
      this.getAttribute("request-speed", parseInt) ||
      element.clientHeight * 1.5;
    this._failureRate = this.getAttribute("failure-rate", parseFloat) || 0.0;

    this.minWaitBetweenRequests =
      this.getAttribute("min-wait-between-requests", parseInt) || 0;
    this.maxWaitBetweenRequests =
      this.getAttribute("max-wait-between-requests", parseInt) || 5000;

    this._retryStrategy = getStrategyFromApplication(
      this,
      (this.getAttribute("retry-strategy") as RetryStrategyName) || "none"
    );

    this.init();

    if (this.debug) {
      this.debug.add(this, "numServers", 1, 64, 1).name("Servers");
      this.debug.add(this, "numClients", 1, 128, 1).name("Clients");

      this.debug
        .add(this, "failureRate", 0, 1, 0.01)
        .name("Failure Rate")
        .onChange(() => {
          for (let server of this.servers) {
            server.failureRate = this.failureRate;
          }
        });

      this.debug
        .add(this, "minWaitBetweenRequests", 0, 10000, 1)
        .name("Min Wait")
        .onChange(() => {
          for (let client of this.clients) {
            client.minWaitBetweenRequests = this.minWaitBetweenRequests;
          }
        });

      this.debug
        .add(this, "maxWaitBetweenRequests", 0, 10000, 1)
        .name("Max Wait")
        .onChange(() => {
          for (let client of this.clients) {
            client.maxWaitBetweenRequests = this.maxWaitBetweenRequests;
          }
        });

      this.debug
        .add(this, "retryStrategy")
        .name("Retry Strategy")
        .options(["none", "linear", "exponential"]);

      this.retryDebug = this.debug.addFolder("Retry Strategy");
      this.retryDebug.open();
      this._retryStrategy.debug(this.retryDebug);
    }

    new ResizeObserver(() => {
      this.requestSpeed =
        this.getAttribute("request-speed", parseInt) ||
        element.clientHeight * 1.5;

      this.layout!.arrange(this.screen);
    }).observe(element);
  }

  get requests(): Request[] {
    return this.stage.children.filter(
      (child) => child instanceof Request
    ) as Request[];
  }

  requestsTo(server: Server): Request[] {
    return this.requests.filter((request) => request.target === server);
  }

  requestsFrom(client: Client): Request[] {
    return this.requests.filter((request) => request.client === client);
  }

  get numServers(): number {
    return this.servers.length;
  }

  set numServers(value: number) {
    if (value > this.servers.length) {
      this.addServers(value - this.servers.length);
    }
    if (value < this.servers.length) {
      this.removeServers(this.servers.length - value);
    }
  }

  get numClients(): number {
    return this.clients.length;
  }

  set failureRate(value: number) {
    if (value < 0 || value > 1) {
      throw new Error("Failure rate must be between 0 and 1");
    }

    this._failureRate = value;
    for (let server of this.servers) {
      server.failureRate = value;
    }
  }

  get failureRate(): number {
    return this._failureRate;
  }

  set numClients(value: number) {
    if (value > this.clients.length) {
      this.addClients(value - this.clients.length);
    }
    if (value < this.clients.length) {
      this.removeClients(this.clients.length - value);
    }
  }

  get retryStrategy(): RetryStrategyName {
    return this._retryStrategy.name;
  }

  set retryStrategy(value: RetryStrategyName) {
    this._retryStrategy = getStrategyFromApplication(this, value);
    if (this.debug && this.retryDebug) {
      this.retryDebug.destroy();
      this.retryDebug = this.debug.addFolder("Retry Strategy");
      this._retryStrategy.debug(this.retryDebug);
    }
    for (let client of this.clients) {
      client.retryStrategy = this._retryStrategy;
    }
  }

  async onAttributeChange(name: string, value: string) {
    await super.onAttributeChange(name, value);

    if (name === "request-speed") {
      this.requestSpeed = parseInt(value);
    } else if (name === "num-servers") {
      this.numServers = parseInt(value);
    } else if (name === "retry-strategy") {
      this.retryStrategy = value as RetryStrategyName;
    } else if (name == "failure-rate") {
      this.failureRate = parseFloat(value);
    }
  }

  init() {
    this.servers = Array.from(
      { length: this.getAttribute("servers", parseInt) || 2 },
      () => new Server({ application: this, failureRate: this.failureRate })
    );
    this.dns.register("backend.example.com", this.servers);

    this.loadBalancers = Array.from(
      { length: 1 },
      () =>
        new LoadBalancer({
          application: this,
          hostname: "backend.example.com",
        })
    );
    this.dns.register("example.com", this.loadBalancers);

    let staggeredStart =
      this.getAttribute("staggered-start", (a) => a === "true") || false;
    let length = this.getAttribute("clients", parseInt) || 2;
    this.clients = Array.from({ length }, (_, i) => {
      let initialDelay: number | undefined = undefined;
      if (staggeredStart) {
        initialDelay = this.maxWaitBetweenRequests * ((i + 1) / length);
      }
      return new Client({
        application: this,
        retryStrategy: this._retryStrategy,
        hostname: "example.com",
        minWaitBetweenRequests: this.minWaitBetweenRequests,
        maxWaitBetweenRequests: this.maxWaitBetweenRequests,
        initialDelay,
      });
    });

    this.initLayout();
    this.ticker.update();
  }

  initLayout() {
    this.stage.removeChild(this.layout!);

    this.serversContainer = new Grid(
      this.servers.map(
        (server) => new Fit(server, { padding: "10%", maxWidth: 50 })
      )
    );

    this.layout = new VStack([
      this.serversContainer,
      new HStack(
        this.loadBalancers.map(
          (lb) => new Fit(lb, { padding: "10%", maxWidth: 50 })
        )
      ),
      new Grid(
        this.clients.map(
          (client) => new Fit(client, { padding: "10%", maxWidth: 40 })
        )
      ),
    ]);

    let screen = this.screen.clone();
    if (this.debug) {
      screen.y += 30;
      screen.height -= 30;
    }
    this.layout.arrange(screen);
    this.stage.addChild(this.layout);
  }

  clear() {
    this.stage.removeChildren();
    for (let server of this.servers) {
      server.destroy();
    }
    this.servers = [];
    for (let loadBalancer of this.loadBalancers) {
      loadBalancer.destroy();
    }
    this.loadBalancers = [];
    for (let client of this.clients) {
      client.destroy();
    }
    this.clients = [];
  }

  addServers(n: number = 1) {
    let newServers = Array.from(
      { length: n },
      () => new Server({ application: this, failureRate: this.failureRate })
    );
    this.servers.push(...newServers);

    this.dns.register("backend.example.com", this.servers);
    this.initLayout();

    for (let server of this.servers) {
      server.repositionRequests();
    }

    gsap.getTweensOf(this.requests).forEach((tween) => tween.invalidate());
  }

  removeServers(n: number = 1) {
    let removedServers = this.servers.splice(-n);
    if (removedServers.length === 0) {
      return;
    }

    let requestsToRemovedServers = this.requests.filter((request) => {
      return removedServers.includes(request.target as Server);
    });

    gsap
      .getTweensOf(requestsToRemovedServers)
      .forEach((tween) => tween.progress(1.0));

    for (let request of requestsToRemovedServers) {
      if (!request.destroyed) {
        request.destroy();
      }
    }

    this.dns.register("backend.example.com", this.servers);
    this.initLayout();

    gsap.getTweensOf(this.requests).forEach((tween) => tween.invalidate());

    for (let server of removedServers) {
      server.destroy();
    }

    for (let server of this.servers) {
      server.repositionRequests();
    }
  }

  addClients(n: number = 1) {
    let newClients = Array.from({ length: n }, () => {
      return new Client({
        application: this,
        retryStrategy: this._retryStrategy,
        hostname: "example.com",
        minWaitBetweenRequests: this.minWaitBetweenRequests,
        maxWaitBetweenRequests: this.maxWaitBetweenRequests,
      });
    });
    this.clients.push(...newClients);

    this.initLayout();

    gsap.getTweensOf(this.requests).forEach((tween) => tween.invalidate());
  }

  removeClients(n: number = 1) {
    let removedClients = this.clients.splice(-n);
    if (removedClients.length === 0) {
      return;
    }

    gsap.getTweensOf(removedClients).forEach((tween) => tween.kill());

    this.initLayout();

    let clientRequests = this.requests.filter((request) =>
      removedClients.includes(request.client)
    );

    gsap.getTweensOf(clientRequests).forEach((tween) => tween.kill());
    for (let request of clientRequests) {
      if (!request.destroyed) {
        request.destroy();
      }
    }

    gsap.getTweensOf(this.requests).forEach((tween) => tween.invalidate());

    for (let removedClient of removedClients) {
      removedClient.destroy();
    }
  }
}
