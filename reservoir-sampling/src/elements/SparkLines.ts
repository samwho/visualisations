import { BaseElement } from "../core/BaseElement";
import type { LogMessage } from "../core/Logs";
import { cssVar } from "../core/Utils";
import type { LogStream } from "./LogStream";

const elementName = `s-spark-lines`;

const stylesheet = document.createElement("style");
stylesheet.innerHTML = `
${elementName} {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 7.5rem;
  overflow: hidden;
  position: relative;
  pointer-events: none;
  user-select: none;
  contain: strict;
  content-visibility: auto;
  margin-bottom: 1.5rem;
}

${elementName} canvas {
  width: 100%;
  height: 100%;
  border: 2px solid #bbbbbb;
  border-radius: 10px;
  pointer-events: none;
  user-select: none;
  contain: strict;
}
`;
document.head.appendChild(stylesheet);

class RpsTracker {
  private count: number = 0;
  private windowMs: number = 1000;

  record() {
    this.count += 1;
    setTimeout(() => (this.count -= 1), this.windowMs);
  }

  get rps() {
    return this.count / (this.windowMs / 1000);
  }
}

class Smoother {
  private f: () => number;
  private velocity: number = 0;
  private lastValue: number = 0;
  private lastTime: Date;
  private deltaDampening: number = 30;
  private arrivalCutoff: number = 0.5;

  constructor(f: () => number) {
    this.f = f;
  }

  get(): number {
    const value = this.f();
    const delta = value - this.lastValue;

    const now = new Date();
    if (this.lastTime === undefined) {
      this.lastTime = now;
    }
    const dt = Math.max(1, now.getTime() - this.lastTime.getTime()) / 1000;
    this.lastTime = now;

    let acceleration = delta / this.deltaDampening / dt;
    if (Math.abs(delta) < this.arrivalCutoff) {
      acceleration *= delta ** 2;
    }

    this.velocity += acceleration;
    this.velocity *= 0.8;
    this.lastValue += this.velocity * dt;
    return this.lastValue;
  }
}

export class SparkLines extends BaseElement {
  private data: Map<string, number[]> = new Map();
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private resolution = 600;
  private updateRate = 1000 / 60;

  private tracker: Record<string, RpsTracker> = {};
  private smoother: Record<string, Smoother> = {};
  private animationFrameId: number | null = null;
  private dataInterval: ReturnType<typeof setInterval> | null = null;
  private sideScrollPoints: number = 0;
  private pixelRatio: number = 2;
  private keys: string[] = ["selected", "total"];
  private redLine?: number;

  width: number;
  height: number;

  init() {
    this.width = this.clientWidth;
    this.height = this.clientHeight;

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width * this.pixelRatio;
    this.canvas.height = this.height * this.pixelRatio;
    this.appendChild(this.canvas);
    this.context = this.canvas.getContext("2d")!;

    if (this.getAttribute("red-line")) {
      this.redLine = parseInt(this.getAttribute("red-line")!);
    }

    const target = this.getAttribute("target");
    if (!target) {
      throw new Error("SparkLines requires a target attribute");
    }

    const targetElement = document.getElementById(target) as LogStream | null;
    if (!targetElement) {
      throw new Error(`SparkLines target ${target} not found`);
    }

    targetElement.onEmit((logs: LogMessage[]) => {
      for (const log of logs) {
        if (log.selected) {
          this.increment("selected");
        }
        this.increment("total");
      }
    });

    targetElement.onHide(() => {
      this.stop();
    });

    targetElement.onVisible(() => {
      this.start();
    });

    this.onResize(() => {
      this.width = this.clientWidth;
      this.height = this.clientHeight;
      this.canvas.width = this.width * this.pixelRatio;
      this.canvas.height = this.height * this.pixelRatio;
      this.trimData();
      this.updateCanvas();
    });

    if (this.getAttribute("hide-selected") === "true") {
      this.keys = this.keys.filter((key) => key !== "selected");
    }
    if (this.getAttribute("hide-total") === "true") {
      this.keys = this.keys.filter((key) => key !== "total");
    }

    for (const key of this.keys) {
      this.data.set(key, []);
      this.tracker[key] = new RpsTracker();
      this.smoother[key] = new Smoother(() => this.tracker[key].rps);
    }

    this.onVisible(() => {
      for (const key of this.keys) {
        this.data.set(key, []);
        this.tracker[key] = new RpsTracker();
        this.smoother[key] = new Smoother(() => this.tracker[key].rps);
      }
    });

    this.start();
  }

  get maxHeight(): number {
    return this.getAttribute("max-height")
      ? parseInt(this.getAttribute("max-height")!)
      : 100;
  }

  increment(key: "selected" | "total") {
    this.tracker[key]?.record();
  }

  recordNewData() {
    for (const key of this.keys) {
      const lineData = this.data.get(key)!;
      lineData.push(this.smoother[key].get());
    }
  }

  trimData() {
    let sideScroll = 0;
    for (const key of this.keys) {
      const lineData = this.data.get(key)!;
      while (lineData.length > this.resolution - 20) {
        sideScroll += 1;
        lineData.shift();
      }
    }
    if (sideScroll) {
      this.sideScrollPoints =
        this.sideScrollPoints + sideScroll / Object.keys(this.tracker).length;
    }
  }

  updateData() {
    this.recordNewData();
    this.trimData();
  }

  start() {
    this.dataInterval = setInterval(() => {
      this.updateData();
    }, this.updateRate);
    const animate = () => {
      this.updateCanvas();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }

  stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.dataInterval) {
      clearInterval(this.dataInterval);
      this.dataInterval = null;
    }
  }

  updateCanvas() {
    this.context.clearRect(
      0,
      0,
      this.width * this.pixelRatio,
      this.height * this.pixelRatio
    );
    this.drawGrid();

    this.data.forEach((lineData, key) => {
      const color = key === "selected" ? "#555555" : "#bbbbbb";
      this.context.beginPath();
      this.context.strokeStyle = color;
      this.context.lineWidth = 2 * this.pixelRatio;
      this.context.lineCap = "round";
      this.context.lineJoin = "round";

      const xStep = (this.width * this.pixelRatio) / this.resolution;

      let lastX = 0;
      let lastY = 0;
      lineData.forEach((value, index) => {
        const x = index * xStep;
        const y =
          (this.height - (value / this.maxHeight) * this.height) *
          this.pixelRatio;

        if (index === 0) {
          this.context.moveTo(x, y);
        } else {
          this.context.lineTo(x, y);
        }

        lastX = x;
        lastY = y;
      });

      this.context.stroke();

      this.context.beginPath();
      this.context.arc(lastX, lastY, 4 * this.pixelRatio, 0, Math.PI * 2);
      this.context.fillStyle = color;
      this.context.fill();
      this.context.closePath();
    });

    if (this.redLine !== undefined) {
      const redLineHeight =
        (this.height - (this.redLine / this.maxHeight) * this.height) *
        this.pixelRatio;
      this.context.beginPath();
      this.context.strokeStyle = cssVar("--palette-red");
      this.context.lineWidth = 2 * this.pixelRatio;
      this.context.moveTo(0, redLineHeight);
      this.context.lineTo(this.width * this.pixelRatio, redLineHeight);
      this.context.stroke();
    }
  }

  drawGrid() {
    const step =
      this.height - (5 / this.maxHeight) * this.height * this.pixelRatio;

    const xLines = Math.ceil(this.canvas.width / step);
    const yLines = Math.ceil(this.canvas.height / step);

    this.context.strokeStyle = "#dddddd";
    this.context.lineWidth = 1 * this.pixelRatio;
    this.context.lineCap = "round";
    this.context.lineJoin = "round";

    for (let i = 1; i <= yLines; i++) {
      const y = i * step;
      this.context.beginPath();
      this.context.moveTo(0, y);
      this.context.lineTo(this.width * this.pixelRatio, y);
      this.context.stroke();
    }

    const dataXStep = (this.width * this.pixelRatio) / this.resolution;
    const xStep = (this.width * this.pixelRatio) / xLines;
    for (let i = 1; i <= xLines; i++) {
      const x = i * step - ((this.sideScrollPoints * dataXStep) % xStep);
      this.context.beginPath();
      this.context.moveTo(x, 0);
      this.context.lineTo(x, this.height * this.pixelRatio);
      this.context.stroke();
    }
  }
}
