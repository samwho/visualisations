import { Application } from "../core/Application";
import { customElement } from "../core/Decorators";
import { Item, Priority } from "../graphics/Item";

import { GlobalEvents } from "../core/GlobalEvents";
import { Bodies, Composite, Engine, Runner, World } from "matter-js";
import { Rectangle } from "pixi.js-legacy";

@customElement("s-graveyard", {
  height: `20rem`,
  boxShadow: "none",
  border: "none",
  backgroundColor: "transparent",
  width: "100vw",
  marginLeft: "-50vw",
  left: "50%",
  marginBottom: "-2.5rem",
  marginTop: "-10em",
  borderBottom: "1px solid #000",
})
export class Graveyard extends Application {
  engine: Engine;
  world: World;
  bodies: [Matter.Body, Item][] = [];
  walls: Matter.Body[] = [];

  constructor(...args: ConstructorParameters<typeof Application>) {
    super(...args);

    this.engine = Engine.create({
      gravity: { x: 0, y: 9.82 },
      positionIterations: 1,
      velocityIterations: 1,
      constraintIterations: 1,
      enableSleeping: true,
    });
    const runner = Runner.create();
    Runner.run(runner, this.engine);

    this.world = this.engine.world;
    this.createWalls();

    GlobalEvents.onRequestGraveyard((request) => {
      this.add(request);
    });

    this.ticker.add((delta) => {
      for (const [body, request] of this.bodies) {
        if (body.position) {
          request.x = body.position.x;
          request.y = body.position.y;
          request.rotation = body.angle;
        }
      }
    });
    this.ticker.start();

    // this.testLoad();
  }

  async testLoad() {
    for (let i = 0; i < 100; i++) {
      const item = new Item({ priority: Priority.LOW }, this);
      item.x = Math.random() * this.screen.width;
      this.add(item);
      await this.sleep(100);
    }
  }

  override async onResize(screen: Rectangle): Promise<void> {
    super.onResize(screen);
    this.createWalls();
  }

  createWalls() {
    for (const wall of this.walls) {
      Composite.remove(this.world, wall);
    }
    this.walls = [];

    // left wall
    const leftWall = Bodies.rectangle(-50, 0, 100, this.screen.height * 2, {
      isStatic: true,
    });
    Composite.add(this.world, leftWall);
    this.walls.push(leftWall);

    // right wall
    const rightWall = Bodies.rectangle(
      this.screen.width + 50,
      0,
      100,
      this.screen.height * 2,
      {
        isStatic: true,
      }
    );
    Composite.add(this.world, rightWall);
    this.walls.push(rightWall);

    // floor
    const floor = Bodies.rectangle(
      0,
      this.screen.height + 50,
      this.screen.width * 2,
      100,
      {
        isStatic: true,
      }
    );
    Composite.add(this.world, floor);
    this.walls.push(floor);
  }

  add(request: Item) {
    const pos = request.getGlobalPosition();
    request.removeFromParent();
    this.stage.addChild(request);
    request.scale.x = 1;
    request.scale.y = 1;

    pos.y = -Item.RADIUS * 2;
    if (pos.x < 0) {
      pos.x = 0;
    } else if (pos.x > this.screen.width) {
      pos.x = this.screen.width;
    }

    const body = Bodies.circle(pos.x, pos.y, Item.RADIUS, {});

    Composite.add(this.world, body);
    this.bodies.push([body, request]);

    if (this.bodies.length > 100) {
      const [body, request] = this.bodies.shift()!;
      Composite.remove(this.world, body);
      request.removeFromParent();
      request.destroy();
    }
  }
}
