import { Color, ColorSource } from "pixi.js-legacy";
import { Application } from "../core/Application";
import { AppLinkedElement } from "./AppLinkedElement";
import { findContrastingColor } from "../core/Colors";
import { prefersReducedMotion } from "../core/Accessibility";

interface Segment {
  value: number;
  valueFormatter: (value: number) => string;
  barElement: HTMLElement;
  valueElement: HTMLElement;
}

interface Bar {
  label: HTMLElement;
  segments: Segment[];
  icon: SVGElement;
  total: number;
  format: "stacked" | "separate";
}

interface BarOptions {
  icon: SVGElement;
  segments: SegmentOptions[];
  format?: "stacked" | "separate";
}

interface SegmentOptions {
  valueFormatter?: (value: number) => string;
  backgroundColor: ColorSource;
  color: ColorSource;
}

export abstract class AppLinkedBarGraph extends AppLinkedElement {
  private _bars: { [key: string]: Bar } = {};
  private _timeline?: gsap.core.Timeline;

  protected createCounter(name: string, opts: BarOptions) {
    if (name in this._bars) {
      throw new Error(`Counter already exists: ${name}`);
    }

    const label = document.createElement("div");
    label.textContent = name;
    label.style.width = "3rem";
    label.style.maxWidth = "3rem";
    label.style.flexShrink = "0";
    label.style.textAlign = "right";

    const icon = opts.icon.cloneNode(true) as SVGElement;
    icon.style.width = "1.5rem";
    icon.style.height = "1rem";
    icon.style.alignSelf = "center";
    icon.style.flexShrink = "0";
    icon.style.paddingRight = "0.5rem";

    const barContainer = document.createElement("div");
    barContainer.style.display = "flex";
    barContainer.style.flexGrow = "1";

    const format = opts.format || "stacked";

    if (format === "separate") {
      barContainer.style.flexDirection = "column";
      barContainer.style.gap = "0.1rem";
      barContainer.style.paddingTop = "0.3rem";
      barContainer.style.paddingBottom = "0.3rem";
    }

    let segments: Segment[] = [];
    for (const [i, segment] of opts.segments.entries()) {
      const barElement = document.createElement("div");
      barElement.style.display = "none";
      barElement.style.justifyContent = "center";
      barElement.style.height = "100%";
      barElement.style.width = "0%";
      barElement.style.backgroundColor = findContrastingColor(
        new Color(segment.backgroundColor)
      ).toRgbaString();

      const valueElement = document.createElement("div");
      valueElement.style.color = new Color(segment.color).toRgbaString();
      valueElement.style.alignSelf = "center";
      valueElement.style.justifySelf = "center";
      valueElement.style.overflow = "hidden";
      valueElement.style.whiteSpace = "nowrap";
      valueElement.style.textOverflow = "clip";

      barElement.appendChild(valueElement);
      barContainer.appendChild(barElement);

      segments.push({
        value: 0,
        valueFormatter: segment.valueFormatter || ((value) => value.toString()),
        barElement,
        valueElement,
      });
    }

    this._bars[name] = {
      ...opts,
      format,
      label,
      segments,
      total: 0,
    };

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.gap = "0.3em";
    container.style.alignItems = "center";

    container.appendChild(label);
    container.appendChild(icon);
    container.appendChild(barContainer);

    this.appendChild(container);
  }

  segment(
    name: string,
    segmentIndex: number = 0
  ): { bar: Bar; segment: Segment } {
    const bar = this._bars[name];
    if (!bar) {
      throw new Error(`Counter does not exist: ${name}`);
    }
    const segment = bar.segments[segmentIndex];
    if (!segment) {
      throw new Error(`Segment does not exist: ${name}[${segmentIndex}]`);
    }
    return { bar, segment };
  }

  increment(name: string, segmentIndex: number = 0) {
    const { bar, segment } = this.segment(name, segmentIndex);
    segment.value++;
    bar.total++;
    this.update();
  }

  set(name: string, value: number): void;
  set(name: string, segmentIndex: number, value: number): void;
  set(name: string, arg1: number, arg2?: number) {
    let segmentIndex = 0;
    let value = 0;
    if (arg2 === undefined) {
      value = arg1;
    } else {
      segmentIndex = arg1;
      value = arg2;
    }

    const { bar, segment } = this.segment(name, segmentIndex);
    bar.total -= segment.value;
    segment.value = value;
    bar.total += segment.value;
    this.update();
  }

  update() {
    this._timeline?.kill();
    if (prefersReducedMotion()) {
      this._timeline = undefined;
    } else {
      this._timeline = this.application.timeline();
    }

    for (const bar of Object.values(this._bars)) {
      if (bar.format === "stacked") {
        let first: HTMLElement | null = null;
        let last: HTMLElement | null = null;
        for (const segment of bar.segments) {
          segment.barElement.style.borderRadius = "0";
          if (segment.value === 0) {
            continue;
          }
          if (!first) first = segment.barElement;
          last = segment.barElement;
        }

        const borderRadius = "0.75rem";
        if (first && last) {
          first.style.borderTopLeftRadius = borderRadius;
          first.style.borderBottomLeftRadius = borderRadius;
          last.style.borderTopRightRadius = borderRadius;
          last.style.borderBottomRightRadius = borderRadius;
        }
      } else {
        for (const segment of bar.segments) {
          segment.barElement.style.borderRadius = "0.75rem";
        }
      }

      const barMax = this.getBarMax();
      const segmentMax = this.getSegmentMax();

      for (const segment of bar.segments) {
        const max = bar.format === "stacked" ? barMax : segmentMax;

        const value = segment.valueFormatter(segment.value);
        segment.valueElement.textContent = value;
        segment.barElement.title = value;
        if (segment.barElement.style.display === "none" && segment.value > 0) {
          segment.barElement.style.display = "flex";
        }
        if (this._timeline) {
          this._timeline.to(
            segment.barElement,
            {
              duration: 0.25,
              width: `${(segment.value / max) * 100}%`,
              ease: "none",
              onComplete: () => {
                if (
                  segment.valueElement.scrollWidth >
                  segment.valueElement.clientWidth
                ) {
                  segment.valueElement.style.visibility = "hidden";
                } else {
                  segment.valueElement.style.visibility = "visible";
                }
              },
            },
            0
          );
        } else {
          segment.barElement.style.width = `${(segment.value / max) * 100}%`;
          if (
            segment.valueElement.scrollWidth > segment.valueElement.clientWidth
          ) {
            segment.valueElement.style.visibility = "hidden";
          } else {
            segment.valueElement.style.visibility = "visible";
          }
        }
      }
    }

    this._timeline?.play();
  }

  private getBarMax() {
    let max = 0;
    for (const bar of Object.values(this._bars)) {
      max = Math.max(max, bar.total);
    }
    return max;
  }

  private getSegmentMax() {
    let max = 0;
    for (const bar of Object.values(this._bars)) {
      for (const segment of bar.segments) {
        max = Math.max(max, segment.value);
      }
    }
    return max;
  }

  override async init(app: Application) {
    this.style.display = "flex";
    this.style.flexDirection = "column";
    this.style.gap = "2px";
  }
}
