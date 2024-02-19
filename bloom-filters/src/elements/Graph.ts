import Application from "../core/Application";
import { Graphics, Rectangle, Text, Color } from "pixi.js-legacy";
import { attributeListener, customElement } from "../core/Decorators";
import { getColors } from "../core/Colors";

class Line {
  graph: Graph;
  color: Color;
  thickness: number;
  label: Text;
  y: (x: number) => number;
  graphics: Graphics;

  static _colorIndex = 1;
  static _colors = getColors();
  static nextColor(): Color {
    return Line._colors[Line._colorIndex++ % Line._colors.length];
  }

  static fromElement(graph: Graph, element: Element): Line {
    const color = new Color(element.getAttribute("color") || Line.nextColor());
    const thickness = parseFloat(element.getAttribute("thickness") || "3");

    const y = element.getAttribute("y");
    if (!y) {
      throw new Error("Missing y attribute");
    }
    const label = new Text(element.getAttribute("label") || y, {
      fill: "#000000",
      fontSize: Axis.fontSizeFromWindow(),
    });
    return new Line(
      graph,
      color,
      thickness,
      label,
      new Function("x", `return ${y}`) as (x: number) => number
    );
  }

  constructor(
    graph: Graph,
    color: Color,
    thickness: number,
    label: Text,
    y: (x: number) => number
  ) {
    this.graph = graph;
    this.color = color;
    this.thickness = thickness;
    this.label = label;
    this.y = y;
    this.graphics = new Graphics();
  }

  draw(to: number) {
    const g = this.graphics;
    g.clear();

    const step = 2;
    let prevX: number | null = null;
    let prevY: number | null = null;

    const from = this.graph.x.min;
    let screenFrom = this.graph.graphToScreen(from, 0)[0];
    let screenTo = this.graph.graphToScreen(to, 0)[0];

    if (screenFrom > screenTo) {
      g.lineStyle(this.thickness + 2, "#ffffff", 1);
      [screenFrom, screenTo] = [screenTo, screenFrom];
    } else {
      g.lineStyle(this.thickness, this.color, 1);
    }

    for (let i = screenFrom; i <= screenTo; i += step) {
      const x = this.graph.screenToGraph(i, 0)[0];
      const y = this.y(x);
      if (isNaN(y) || !isFinite(y)) {
        throw new Error(`y(${x}) is ${y}`);
      }
      const [screenX, screenY] = this.graph.graphToScreen(x, y);

      if (prevX === null || prevY === null) {
        g.moveTo(screenX, screenY);
      } else {
        g.moveTo(prevX, prevY);
      }
      g.lineTo(screenX, screenY);

      prevX = screenX;
      prevY = screenY;
    }
  }
}

class Axis {
  min: number;
  max: number;
  tics: number | null = null;
  ticformat: (x: number) => string;
  label: Text | null = null;

  _tics: [number, Text][] = [];
  maxTicWidth: number = 0;
  maxTicHeight: number = 0;

  _fontSize: number;

  constructor(
    min: number,
    max: number,
    tics: number | null,
    ticformat: (x: number) => string,
    label: string | null
  ) {
    this.min = min;
    this.max = max;
    this.tics = tics;
    this.ticformat = ticformat;

    if (label) {
      this.label = new Text(label, { fill: "#000000" });
    }

    if (this.tics) {
      let v = this.min;
      while (v <= this.max) {
        const text = new Text(this.ticformat(v), {
          fontSize: this._fontSize,
          fill: "#000000",
        });
        this._tics.push([v, text]);
        this.maxTicWidth = Math.max(this.maxTicWidth, text.width);
        this.maxTicHeight = Math.max(this.maxTicHeight, text.height);
        v += this.tics;
      }
    }
  }

  refresh() {
    if (this._fontSize === Axis.fontSizeFromWindow()) {
      return;
    }
    this._fontSize = Axis.fontSizeFromWindow();

    this.maxTicHeight = 0;
    this.maxTicWidth = 0;
    for (let [, text] of this._tics) {
      text.style.fontSize = this._fontSize;
      this.maxTicWidth = Math.max(this.maxTicWidth, text.width);
      this.maxTicHeight = Math.max(this.maxTicHeight, text.height);
    }

    if (this.label) {
      this.label.style.fontSize = this._fontSize;
    }
  }

  eachTic(callback: (tic: number, text: Text) => void) {
    this._tics.forEach(([tic, text]) => callback(tic, text));
  }

  static fontSizeFromWindow(): number {
    if (window.innerWidth < 500) {
      return 12;
    } else if (window.innerWidth < 700) {
      return 14;
    } else {
      return 16;
    }
  }

  static fromElement(element: Element | null): Axis {
    if (!element) {
      return new Axis(0, 1, null, (x) => x.toString(), null);
    }

    let tics = element.getAttribute("tics");
    let ticformat = element.getAttribute("ticformat");
    return new Axis(
      parseFloat(element.getAttribute("min") || "0"),
      parseFloat(element.getAttribute("max") || "1"),
      tics ? parseFloat(tics) : null,
      ticformat
        ? (new Function("tic", `return ${ticformat}`) as (x: number) => string)
        : (x) => x.toString(),
      element.getAttribute("label")
    );
  }
}

@customElement("s-graph")
export default class Graph extends Application {
  x: Axis;
  y: Axis;

  drawUpTo: number;
  grid: boolean;
  gridColor: string;

  lines: Line[] = [];
  drawSpace: Rectangle;

  _axes: Graphics;
  _lines: Graphics;
  _legend: Graphics;
  _requestedFrame: number | null = null;

  constructor(...args: ConstructorParameters<typeof Application>) {
    super(...args);

    this.x = Axis.fromElement(this.root.querySelector("axes x"));
    this.y = Axis.fromElement(this.root.querySelector("axes y"));

    const _drawUpTo = this.getAttribute("drawupto");
    if (_drawUpTo) {
      this.drawUpTo = parseFloat(_drawUpTo);
    } else {
      this.drawUpTo = this.x.max;
    }

    this._lines = new Graphics();
    this._axes = new Graphics();
    this._legend = new Graphics();

    this.stage.addChild(this._axes);
    this.stage.addChild(this._lines);
    this.stage.addChild(this._legend);

    this.initDrawSpace();

    this.lines = [];
    for (let element of this.root.querySelectorAll("lines line")) {
      const line = Line.fromElement(this, element);
      this._lines.addChild(line.graphics);
      this.lines.push(line);
    }
    this.fullDraw();

    const gridAttr = this.getAttribute("grid", (v) => v === "true");
    this.grid = gridAttr !== null ? gridAttr : true;
    this.gridColor = this.getAttribute("gridcolor") || "#cccccc";

    this.resizeObserver = new ResizeObserver(() => {
      this.x.refresh();
      this.y.refresh();
      this.initDrawSpace();
      this.fullDraw();
    });
    this.resizeObserver.observe(this.element);
  }

  get fontSize(): number {
    if (this.root.clientWidth < 500) {
      return 10;
    } else if (this.root.clientWidth < 700) {
      return 12;
    } else {
      return 14;
    }
  }

  get graphWidth(): number {
    return this.x.max - this.x.min;
  }

  get graphHeight(): number {
    return this.y.max - this.y.min;
  }

  drawLegend() {
    const legend = this.root.querySelector("legend");
    if (!legend) {
      return;
    }

    this._legend.clear();
    this._legend.removeChildren();

    const lineLength = this.drawSpace.width / 20;
    const padding = this.drawSpace.width / 40;

    let texts: Text[] = [];
    let background = new Graphics();
    let lines = new Graphics();
    this._legend.addChild(background);
    this._legend.addChild(lines);

    for (const [i, line] of this.lines.entries()) {
      line.label.style.fontSize = Axis.fontSizeFromWindow();
      line.label.position.set(
        lineLength + padding * 2,
        i * line.label.height + padding / 2
      );
      lines.lineStyle(line.thickness, line.color, 1);
      lines.moveTo(
        padding,
        i * line.label.height + padding / 2 + line.label.height / 2
      );
      lines.lineTo(
        padding + lineLength,
        i * line.label.height + padding / 2 + line.label.height / 2
      );

      this._legend.addChild(line.label);
      texts.push(line.label);
    }

    background.beginFill(0xffffff, 0.85);
    background.lineStyle(1, 0xaaaaaa, 1);
    background.drawRoundedRect(
      0,
      0,
      this._legend.width + 2 * padding,
      this._legend.height + padding,
      5
    );

    const position = legend.getAttribute("position") || "top-left";
    switch (position) {
      case "top-left":
        this._legend.position.set(
          this.drawSpace.x + padding,
          this.drawSpace.y + padding
        );
        break;
      case "top-right":
        this._legend.position.set(
          this.drawSpace.x +
            this.drawSpace.width -
            this._legend.width -
            padding,
          this.drawSpace.y + padding
        );
        break;
      case "bottom-left":
        this._legend.position.set(
          this.drawSpace.x + padding,
          this.drawSpace.y +
            this.drawSpace.height -
            this._legend.height -
            padding
        );
        break;
      case "bottom-right":
        this._legend.position.set(
          this.drawSpace.x +
            this.drawSpace.width -
            this._legend.width -
            padding,
          this.drawSpace.y +
            this.drawSpace.height -
            this._legend.height -
            padding
        );
        break;
      default:
        throw new Error("Invalid legend position");
    }
  }

  @attributeListener("drawupto")
  onDrawUpToChanged(value: string) {
    this.drawUpTo = parseFloat(value);
    this.requestDraw();
  }

  graphToScreen(x: number, y: number): [number, number] {
    return [
      this.drawSpace.x +
        (x - this.x.min) * (this.drawSpace.width / this.graphWidth),
      this.drawSpace.y +
        this.drawSpace.height -
        (y - this.y.min) * (this.drawSpace.height / this.graphHeight),
    ];
  }

  screenToGraph(x: number, y: number): [number, number] {
    return [
      this.x.min +
        (x - this.drawSpace.x) * (this.graphWidth / this.drawSpace.width),
      this.y.min +
        (this.drawSpace.y + this.drawSpace.height - y) *
          (this.graphHeight / this.drawSpace.height),
    ];
  }

  initDrawSpace() {
    this.drawSpace = this.screen.clone();
    if (this.x.tics) {
      this.drawSpace.height -= this.x.maxTicHeight;
      this.drawSpace.width -= this.x.maxTicWidth;
    }
    if (this.x.label) {
      this.drawSpace.height -= this.x.label.height * 1.5;
    }
    if (this.y.tics) {
      this.drawSpace.width -= this.y.maxTicWidth;
      this.drawSpace.x += this.y.maxTicWidth;
      this.drawSpace.height -= this.y.maxTicHeight;
      this.drawSpace.y += this.y.maxTicHeight;
    }
    if (this.y.label) {
      this.drawSpace.width -= this.y.label.height * 1.5;
      this.drawSpace.x += this.y.label.height * 1.5;
    }
  }

  drawAxes() {
    this._axes.clear();
    this._axes.removeChildren();
    if (this.y.tics) {
      this.y.eachTic((y, text) => {
        if (this.grid) {
          this._axes.lineStyle(1, this.gridColor, 1);
          this._axes.moveTo(...this.graphToScreen(this.x.min, y));
          this._axes.lineTo(...this.graphToScreen(this.x.max, y));
        } else {
          this._axes.lineStyle(1, 0x000000, 1);
          const [screenX, screenY] = this.graphToScreen(0, y);
          this._axes.moveTo(screenX - 5, screenY);
          this._axes.lineTo(screenX + 5, screenY);
        }

        if (y !== 0) {
          text.position.set(...this.graphToScreen(0, y));
          text.anchor.set(0.5, 0.5);
          text.position.x -= text.width / 2 + 2;
          this._axes.addChild(text);
        }
      });
    }

    if (this.x.tics) {
      this.x.eachTic((x, text) => {
        if (this.grid) {
          this._axes.lineStyle(1, this.gridColor, 1);
          this._axes.moveTo(...this.graphToScreen(x, this.y.min));
          this._axes.lineTo(...this.graphToScreen(x, this.y.max));
        } else {
          this._axes.lineStyle(1, 0x000000, 1);
          const [screenX, screenY] = this.graphToScreen(x, 0);
          this._axes.moveTo(screenX, screenY - 5);
          this._axes.lineTo(screenX, screenY + 5);
        }

        if (x !== 0) {
          text.position.set(...this.graphToScreen(x, 0));
          text.anchor.set(0.5, 0.5);
          text.position.y += text.height / 2 + 2;
          this._axes.addChild(text);
        }
      });
    }

    // Y axis
    this._axes.lineStyle(1, 0x000000, 1);
    this._axes.moveTo(...this.graphToScreen(0, this.y.min));
    this._axes.lineTo(...this.graphToScreen(0, this.y.max));

    // X axis
    this._axes.lineStyle(1, 0x000000, 1);
    this._axes.moveTo(...this.graphToScreen(this.x.min, 0));
    this._axes.lineTo(...this.graphToScreen(this.x.max, 0));

    if (this.x.label) {
      this.x.label.position.x = this.drawSpace.width / 2 + this.drawSpace.x;
      this.x.label.position.y = this.screen.height - this.x.label.height / 2;
      this.x.label.anchor.set(0.5, 0.5);
      this._axes.addChild(this.x.label);
    }

    if (this.y.label) {
      this.y.label.position.set(
        this.y.label.height / 2 + 2,
        this.drawSpace.height / 2 + this.drawSpace.y
      );
      this.y.label.anchor.set(0.5, 0.5);
      this.y.label.rotation = -Math.PI / 2;
      this._axes.addChild(this.y.label);
    }
  }

  fullDraw() {
    if (this._requestedFrame !== null) {
      cancelAnimationFrame(this._requestedFrame);
      this._requestedFrame = null;
    }
    this._requestedFrame = requestAnimationFrame(() => {
      this.drawAxes();
      this.drawLegend();
      this.draw();
      this._requestedFrame = null;
    });
  }

  requestDraw() {
    if (this._requestedFrame === null) {
      this._requestedFrame = requestAnimationFrame(() => {
        this.draw();
        this._requestedFrame = null;
      });
    }
  }

  draw() {
    this.lines.forEach((line) => line.draw(this.drawUpTo));
    this.ticker.update();
  }
}
