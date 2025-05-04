import {
  Body,
  Bodies,
  Common,
  Engine,
  Runner,
  World,
  Events,
  Mouse,
  MouseConstraint,
} from "matter-js";
import { wait } from "../core/Utils";
import { SimpleReservoir, type Reservoir } from "../core/Samplers";
import { SVGElement } from "../core/SVGElement";

interface Shape {
  type: "ball" | "triangle" | "square" | "diamond";
  element: SVGPathElement;
  body: Body;
}

function pathFromVertices(
  vertices: Matter.Vector[],
  x: number,
  y: number
): SVGPathElement {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const d = vertices
    .map((v, i) => `${i === 0 ? "M" : "L"} ${v.x - x} ${v.y - y}`)
    .join(" ");
  path.setAttribute("d", d + " Z");
  return path;
}

const bodyOpts = {
  restitution: 0.2,
  friction: 0.1,
  density: 0.001,
};

function createBall(x: number, y: number, size: number): Shape {
  const body = Bodies.circle(x, y, size, bodyOpts);
  const path = pathFromVertices(body.vertices, x, y);
  path.setAttribute("fill", "var(--palette-orange)");
  return { element: path, body, type: "ball" };
}

function createTriangle(x: number, y: number, size: number): Shape {
  const body = Bodies.polygon(x, y, 3, size, bodyOpts);
  const path = pathFromVertices(body.vertices, x, y);
  path.setAttribute("fill", "var(--palette-blue)");
  return { element: path, body, type: "triangle" };
}

function createSquare(x: number, y: number, size: number): Shape {
  const body = Bodies.rectangle(x, y, size, size, bodyOpts);
  const path = pathFromVertices(body.vertices, x, y);
  path.setAttribute("fill", "var(--palette-green)");
  return { element: path, body, type: "square" };
}

function createDiamond(x: number, y: number, size: number): Shape {
  const body = Bodies.polygon(x, y, 4, size, bodyOpts);
  const path = pathFromVertices(body.vertices, x, y);
  path.setAttribute("fill", "var(--palette-pink)");
  return { element: path, body, type: "diamond" };
}

const elementName = `s-hero`;

const stylesheet = document.createElement("style");
stylesheet.innerHTML = `
${elementName} {
  display: block;
  position: relative;
  margin-top: -3rem;
  margin-left: -50vw;
  left: 50%;
  width: 100vw;
  height: 300px;
  border-bottom: 3px solid #c0c0c0;
  background-color: #f0f0f0;
}
`;
document.head.appendChild(stylesheet);

export class Hero extends SVGElement {
  engine: Engine;
  runner: Runner;

  floor: Body;
  leftWall: Body;
  rightWall: Body;
  wallThickness = 300;
  wallHeight = 100000;

  delay = 200;
  numShapes = 50;
  shapes: Shape[] = [];

  sample = 3;
  reservoir: Reservoir<Shape>;

  init() {
    super.init();

    this.engine = Engine.create({
      enableSleeping: true,
      velocityIterations: 1,
      positionIterations: 1,
      constraintIterations: 1,
    });

    Events.on(this.engine, "afterUpdate", () => {
      if (this.hidden) {
        Runner.stop(this.runner);
        return;
      }
      for (const { element, body } of this.shapes) {
        element.style.transform = `translate(${body.position.x}px, ${body.position.y}px) rotate(${body.angle}rad)`;
      }
    });

    this.reservoir = new SimpleReservoir(this.sample);
    this.reservoir.onAdd((shape) => {
      shape.element.setAttribute(
        "oldfill",
        shape.element.getAttribute("fill")!
      );
      shape.element.setAttribute("fill", "var(--palette-grey)");
      shape.element.setAttribute("stroke", "var(--palette-blue)");
      shape.element.setAttribute("stroke-width", "3");
      shape.element.setAttribute("stroke-dasharray", "3, 3");
    });
    this.reservoir.onRemove((shape) => {
      shape.element.setAttribute(
        "fill",
        shape.element.getAttribute("oldfill")!
      );
      shape.element.setAttribute("stroke", "none");
      shape.element.setAttribute("stroke-width", "0");
      shape.element.setAttribute("stroke-dasharray", "0");
    });

    this.engine.gravity.x = 0;
    this.engine.gravity.y = 1;

    this.floor = Bodies.rectangle(
      this.clientWidth / 2,
      this.clientHeight + this.wallThickness / 2,
      this.clientWidth,
      this.wallThickness,
      { isStatic: true, friction: 0.1 }
    );

    this.leftWall = Bodies.rectangle(
      -this.wallThickness / 2,
      this.clientHeight / 2,
      this.wallThickness,
      this.wallHeight,
      { isStatic: true, friction: 0.1 }
    );

    this.rightWall = Bodies.rectangle(
      this.clientWidth + this.wallThickness / 2,
      this.clientHeight / 2,
      this.wallThickness,
      this.wallHeight,
      { isStatic: true, friction: 0.1 }
    );

    World.add(this.engine.world, [this.floor, this.leftWall, this.rightWall]);

    this.runner = Runner.create();
    Runner.run(this.runner, this.engine);

    const mouse = Mouse.create(this);
    const mouseConstraint = MouseConstraint.create(this.engine, {
      mouse,
      constraint: { stiffness: 0.2 },
    });
    // @ts-expect-error - lil hack to allow scrolling
    this.removeEventListener("wheel", mouseConstraint.mouse.mousewheel);
    World.add(this.engine.world, mouseConstraint);

    this.onHide(() => {
      Runner.stop(this.runner);
    });

    this.onVisible(() => {
      Runner.run(this.runner, this.engine);
      this.run();
    });

    this.onResize(() => {
      // Update floor
      Body.setPosition(this.floor, {
        x: this.clientWidth / 2,
        y: this.clientHeight + this.wallThickness / 2,
      });

      Body.setVertices(this.floor, [
        { x: 0, y: 0 },
        { x: this.clientWidth, y: 0 },
        { x: this.clientWidth, y: this.wallThickness },
        { x: 0, y: this.wallThickness },
      ]);

      // Update left wall
      Body.setPosition(this.leftWall, {
        x: -this.wallThickness / 2,
        y: this.clientHeight / 2,
      });

      Body.setVertices(this.leftWall, [
        { x: 0, y: 0 },
        { x: this.wallThickness, y: 0 },
        { x: this.wallThickness, y: this.wallHeight },
        { x: 0, y: this.wallHeight },
      ]);

      // Update right wall
      Body.setPosition(this.rightWall, {
        x: this.clientWidth + this.wallThickness / 2,
        y: this.clientHeight / 2,
      });

      Body.setVertices(this.rightWall, [
        { x: 0, y: 0 },
        { x: this.wallThickness, y: 0 },
        { x: this.wallThickness, y: this.wallHeight },
        { x: 0, y: this.wallHeight },
      ]);
    });

    this.run();
  }

  async run() {
    while (this.shapes.length < this.numShapes) {
      if (this.hidden) {
        return;
      }
      this.addShape();
      await wait(this.delay);
    }
  }

  addShape() {
    const size = Common.random(20, 35);

    const x = this.clientWidth / 2 + Common.random(-100, 100);
    const y = -50; // Start above the viewport

    const shape = Common.choose([
      createBall,
      createTriangle,
      createSquare,
      createDiamond,
    ])(x, y, size);

    this.shapes.push(shape);
    World.add(this.engine.world, shape.body);
    this.reservoir.sample(shape);

    this.svg.appendChild(shape.element);
  }
}
