import { BaseElement } from "../core/BaseElement";
import { getColors } from "../core/Colors";
import { cssVar } from "../core/Utils";

const COLORS = [
  "--palette-green",
  "--palette-dark-blue",
  "--palette-red",
  "--palette-pink",
];

type Shape = "square" | "circle" | "diamond" | "hexagon";

function drawShapeAt(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  x: number,
  y: number,
  size: number
) {
  ctx.save();
  ctx.translate(x, y);
  switch (shape) {
    case "square":
      ctx.fillRect(-size / 2, -size / 2, size, size);
      break;
    case "circle":
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "diamond":
      ctx.beginPath();
      ctx.moveTo(0, -size / 2);
      ctx.lineTo(size / 2, 0);
      ctx.lineTo(0, size / 2);
      ctx.lineTo(-size / 2, 0);
      ctx.closePath();
      ctx.fill();
      break;
    case "hexagon":
      ctx.beginPath();
      ctx.moveTo(0, -size / 2);
      ctx.lineTo(size / 2, -size / 4);
      ctx.lineTo(size / 2, size / 4);
      ctx.lineTo(0, size / 2);
      ctx.lineTo(-size / 2, size / 4);
      ctx.lineTo(-size / 2, -size / 4);
      ctx.closePath();
      ctx.fill();
      break;
  }
  ctx.restore();
}

const SHAPES: Shape[] = ["square", "circle", "diamond", "hexagon"];

class Line {
  graph: Graph;
  color: string;
  thickness: number;
  label: string;
  shape: Shape;
  y: (x: number) => number;

  static _index = 0;
  static _colors = getColors();
  static nextColor(): string {
    const color = COLORS[Line._index++ % COLORS.length]!;
    return cssVar(color)!;
  }

  static fromElement(graph: Graph, element: Element): Line {
    const color = element.getAttribute("color") || Line.nextColor();
    const shape = SHAPES[Line._index % SHAPES.length]!;
    const thickness = parseFloat(element.getAttribute("thickness") || "3");

    const y = element.getAttribute("y");
    if (!y) {
      throw new Error("Missing y attribute");
    }
    const label = element.getAttribute("label") || y;
    return new Line(
      graph,
      color,
      thickness,
      shape,
      label,
      new Function("x", `return ${y}`) as (x: number) => number
    );
  }

  constructor(
    graph: Graph,
    color: string,
    thickness: number,
    shape: Shape,
    label: string,
    y: (x: number) => number
  ) {
    this.graph = graph;
    this.color = color;
    this.thickness = thickness;
    this.shape = shape;
    this.label = label;
    this.y = y;
  }

  draw(ctx: CanvasRenderingContext2D, to: number) {
    const step = 1;
    let prevX: number | null = null;
    let prevY: number | null = null;

    const from = this.graph.x.min;
    let screenFrom = this.graph.graphToScreen(from, 0)[0];
    let screenTo = this.graph.graphToScreen(to, 0)[0];

    ctx.beginPath();
    if (screenFrom > screenTo) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = this.thickness + 2;
      [screenFrom, screenTo] = [screenTo, screenFrom];
    } else {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.thickness;
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = screenFrom; i <= screenTo; i += step) {
      const x = this.graph.screenToGraph(i, 0)[0];
      const y = this.y(x);

      if (isNaN(y) || !isFinite(y)) {
        continue;
      }
      if (y < this.graph.y.min || y > this.graph.y.max + 30) {
        continue;
      }

      const [screenX, screenY] = this.graph.graphToScreen(x, y);

      if (prevX === null || prevY === null) {
        ctx.moveTo(screenX, screenY);
      } else {
        ctx.lineTo(screenX, screenY);
      }

      prevX = screenX;
      prevY = screenY;
    }

    ctx.stroke();
    if (
      prevX &&
      prevY &&
      screenTo - screenFrom > 1 &&
      this.graph.lines.length > 1
    ) {
      ctx.fillStyle = this.color;
      drawShapeAt(ctx, this.shape, prevX, prevY, 10);
    }
  }
}

class Axis {
  min: number;
  max: number;
  tics: number | null = null;
  ticformat: (x: number) => string;
  label: string | null = null;

  _tics: [number, string][] = [];
  maxTicWidth: number = 0;
  maxTicHeight: number = 0;

  _fontSize: number = Axis.fontSizeFromWindow();

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
    this.label = label;

    if (this.tics) {
      let v = this.min;
      while (v <= this.max) {
        const text = this.ticformat(v);
        this._tics.push([v, text]);
        // Estimate text dimensions (will be more accurate when drawn)
        this.maxTicWidth = Math.max(
          this.maxTicWidth,
          text.length * this._fontSize * 0.6
        );
        this.maxTicHeight = Math.max(this.maxTicHeight, this._fontSize);
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
      // Estimate text dimensions (will be more accurate when drawn)
      this.maxTicWidth = Math.max(
        this.maxTicWidth,
        text.length * this._fontSize * 0.6
      );
      this.maxTicHeight = Math.max(this.maxTicHeight, this._fontSize);
    }
  }

  eachTic(callback: (tic: number, text: string) => void) {
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

export default class Graph extends BaseElement {
  x!: Axis;
  y!: Axis;

  drawUpTo!: number;
  grid!: boolean;
  gridColor!: string;

  lines: Line[] = [];
  drawSpace!: { x: number; y: number; width: number; height: number };

  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  _requestedFrame: number | null = null;

  init() {
    // Create canvas
    this.canvas = document.createElement("canvas");
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.appendChild(this.canvas);

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get canvas context");
    }
    this.ctx = ctx;

    // Parse configuration
    this.x = Axis.fromElement(this.querySelector("axes x"));
    this.y = Axis.fromElement(this.querySelector("axes y"));

    const _drawUpTo = this.getAttribute("drawupto");
    if (_drawUpTo) {
      this.drawUpTo = parseFloat(_drawUpTo);
    } else {
      this.drawUpTo = this.x.max;
    }

    const gridAttr = this.getAttribute("grid");
    this.grid = gridAttr !== "false";
    this.gridColor = this.getAttribute("gridcolor") || "#cccccc";

    // Initialize lines
    this.lines = [];
    const lineElements = Array.from(this.querySelectorAll("lines line"));
    for (let element of lineElements) {
      element.role = "none";
      const line = Line.fromElement(this, element);
      this.lines.push(line);
    }

    const legend = this.querySelector("legend");
    if (legend) {
      legend.role = "none";
    }

    this.role = "figure";
    this.ariaLabel = `A graph showing the lines: ${this.lines
      .map((line) => line.label)
      .join(", ")}`;

    // Set up resize handling
    this.onResize(() => {
      this.updateCanvasSize();
      this.x.refresh();
      this.y.refresh();
      this.initDrawSpace();

      this.fullDraw(this.ctx);
    });

    this.updateCanvasSize();
    this.initDrawSpace();
    this.fullDraw(this.ctx);
  }

  updateCanvasSize() {
    const rect = this.getBoundingClientRect();
    this.canvas.width = rect.width * devicePixelRatio;
    this.canvas.height = rect.height * devicePixelRatio;
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
    this.canvas.style.width = rect.width + "px";
    this.canvas.style.height = rect.height + "px";
  }

  get fontSize(): number {
    if (this.clientWidth < 500) {
      return 10;
    } else if (this.clientWidth < 700) {
      return 12;
    } else {
      return 14;
    }
  }

  get canvasRect() {
    return {
      x: 0,
      y: 0,
      width: this.clientWidth,
      height: this.clientHeight,
    };
  }

  get graphWidth(): number {
    return this.x.max - this.x.min;
  }

  get graphHeight(): number {
    return this.y.max - this.y.min;
  }

  drawLegend(ctx: CanvasRenderingContext2D) {
    const legend = this.querySelector("legend");
    if (!legend) {
      return;
    }

    const lineLength = this.drawSpace.width / 20;
    const padding = this.drawSpace.width / 40;
    const fontSize = Axis.fontSizeFromWindow();

    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // Calculate legend dimensions
    let maxTextWidth = 0;
    let maxTextHeight = 0;
    for (const line of this.lines) {
      const metrics = ctx.measureText(line.label);
      maxTextWidth = Math.max(maxTextWidth, metrics.width);
      maxTextHeight = Math.max(
        maxTextHeight,
        metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
      );
    }

    const linePadding = padding / 2;
    const legendWidth = lineLength + padding * 2 + maxTextWidth + padding;
    const legendHeight =
      this.lines.length * (maxTextHeight + linePadding) + padding - linePadding;

    // Determine legend position
    const position = legend.getAttribute("position") || "top-left";
    let legendX = this.drawSpace.x + padding;
    let legendY = this.drawSpace.y + padding;

    switch (position) {
      case "top-right":
        legendX =
          this.drawSpace.x + this.drawSpace.width - legendWidth - padding;
        break;
      case "bottom-left":
        legendY =
          this.drawSpace.y + this.drawSpace.height - legendHeight - padding;
        break;
      case "bottom-right":
        legendX =
          this.drawSpace.x + this.drawSpace.width - legendWidth - padding;
        legendY =
          this.drawSpace.y + this.drawSpace.height - legendHeight - padding;
        break;
    }

    // Draw legend background
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.strokeStyle = "#aaaaaa";
    ctx.lineWidth = 1;
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

    // Draw legend items
    for (const [i, line] of this.lines.entries()) {
      const y = legendY + padding + i * (maxTextHeight + linePadding);

      // Draw label
      ctx.fillStyle = "#000000";
      const textX = legendX + lineLength + padding * 2;
      const textY = y - linePadding;
      ctx.fillText(line.label, textX, textY);

      // Draw line sample
      const lineY = textY + maxTextHeight / 2 - line.thickness / 2;
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.thickness;
      ctx.beginPath();
      ctx.moveTo(legendX + padding, lineY);
      ctx.lineTo(legendX + padding + lineLength, lineY);
      ctx.stroke();

      ctx.fillStyle = line.color;
      drawShapeAt(ctx, line.shape, legendX + padding + lineLength, lineY, 10);
    }
  }

  static get observedAttributes() {
    return ["drawupto"];
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === "drawupto") {
      this.drawUpTo = parseFloat(newValue);
      this.requestDraw(this.ctx);
    }
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
    const rect = this.canvasRect;
    this.drawSpace = { ...rect };

    const fontSize = Axis.fontSizeFromWindow();

    if (this.x.tics) {
      this.drawSpace.height -= this.x.maxTicHeight + 5; // 5px padding
      this.drawSpace.width -= this.x.maxTicWidth / 2;
    }
    if (this.x.label) {
      this.drawSpace.height -= fontSize * 1.5;
    }
    if (this.y.tics) {
      this.drawSpace.width -= this.y.maxTicWidth + 10; // 10px padding
      this.drawSpace.x += this.y.maxTicWidth + 10;
      this.drawSpace.height -= this.y.maxTicHeight / 2;
      this.drawSpace.y += this.y.maxTicHeight / 2;
    }
    if (this.y.label) {
      this.drawSpace.width -= fontSize * 1.5;
      this.drawSpace.x += fontSize * 1.5;
    }
  }

  drawAxes(ctx: CanvasRenderingContext2D) {
    const fontSize = Axis.fontSizeFromWindow();
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const fontMeasure = ctx.measureText("M");
    const actualFontHeight =
      fontMeasure.actualBoundingBoxAscent +
      fontMeasure.actualBoundingBoxDescent;

    if (this.y.tics) {
      this.y.eachTic((y, text) => {
        const [screenX, screenY] = this.graphToScreen(0, y);

        if (this.grid) {
          ctx.strokeStyle = this.gridColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(...this.graphToScreen(this.x.min, y));
          ctx.lineTo(...this.graphToScreen(this.x.max, y));
          ctx.stroke();
        } else {
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(screenX - 5, screenY);
          ctx.lineTo(screenX + 5, screenY);
          ctx.stroke();
        }

        if (y !== 0) {
          ctx.fillStyle = "#000000";
          ctx.textAlign = "right";
          ctx.fillText(text, screenX - 5, screenY);
        }
      });
    }

    if (this.x.tics) {
      this.x.eachTic((x, text) => {
        const [screenX, screenY] = this.graphToScreen(x, 0);

        if (this.grid) {
          ctx.strokeStyle = this.gridColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(...this.graphToScreen(x, this.y.min));
          ctx.lineTo(...this.graphToScreen(x, this.y.max));
          ctx.stroke();
        } else {
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(screenX, screenY - 5);
          ctx.lineTo(screenX, screenY + 5);
          ctx.stroke();
        }

        if (x !== 0) {
          ctx.fillStyle = "#000000";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(text, screenX, screenY + actualFontHeight / 2);
        }
      });
    }

    // Y axis
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(...this.graphToScreen(0, this.y.min));
    ctx.lineTo(...this.graphToScreen(0, this.y.max));
    ctx.stroke();

    // X axis
    ctx.beginPath();
    ctx.moveTo(...this.graphToScreen(this.x.min, 0));
    ctx.lineTo(...this.graphToScreen(this.x.max, 0));
    ctx.stroke();

    // Labels
    if (this.x.label) {
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(
        this.x.label,
        this.drawSpace.x + this.drawSpace.width / 2,
        this.canvasRect.height - 5
      );
    }

    if (this.y.label) {
      ctx.save();
      ctx.translate(15, this.drawSpace.y + this.drawSpace.height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.y.label, 0, 0);
      ctx.restore();
    }
  }

  fullDraw(ctx: CanvasRenderingContext2D) {
    if (this._requestedFrame !== null) {
      cancelAnimationFrame(this._requestedFrame);
      this._requestedFrame = null;
    }
    this._requestedFrame = requestAnimationFrame(() => {
      this.drawAxes(ctx);
      this.draw(ctx);
      this.drawLegend(ctx);
      this._requestedFrame = null;
    });
  }

  requestDraw(ctx: CanvasRenderingContext2D) {
    if (this._requestedFrame === null) {
      this._requestedFrame = requestAnimationFrame(() => {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawAxes(ctx);
        this.draw(ctx);
        this.drawLegend(ctx);
        this._requestedFrame = null;
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.lines.forEach((line) => line.draw(ctx, this.drawUpTo));
  }
}
