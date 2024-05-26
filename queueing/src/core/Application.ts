import {
  DisplayObject,
  IDestroyOptions,
  Application as PixiApplication,
  Rectangle,
} from "pixi.js-legacy";
import * as PIXI from "pixi.js-legacy";
import { gsap } from "gsap";
import { Duration } from "./Duration";
import { Positioner } from "pixijs-layout";
import { EventManager } from "./Events";
import { Tasklist } from "./Tasklist";
import { GlobalEvents } from "./GlobalEvents";

export class Application extends PixiApplication {
  static nextId: number = 0;
  id: number = Application.nextId++;
  element: HTMLElement;
  layout: (Positioner & DisplayObject) | null = null;

  protected handedness: "left" | "right" = "left";
  private _visible: boolean = false;
  private _resizeObserver?: ResizeObserver;
  private _intersectionObserver?: IntersectionObserver;
  private _linkedVisibility: Application[] = [];
  private _forceVisible: boolean = false;

  events: EventManager;

  constructor(element: HTMLElement) {
    super({
      backgroundAlpha: 0,
      resizeTo: element,
      antialias: true,
      autoDensity: true,
      autoStart: false,
      forceCanvas: true,
      eventFeatures: {
        move: true,
        globalMove: false,
        click: true,
        wheel: false,
      },
    });

    this.renderer.plugins.interaction.autoPreventDefault = false;
    this.renderer.view.style!.touchAction = "auto";

    this._linkedVisibility.push(this);
    this.element = element;
    this.events = new EventManager();

    // @ts-ignore
    this.element.appendChild(this.view);
    this.element.style.position = "relative";
    this.element.style.userSelect = "none";

    this.stage.interactiveChildren = false;

    if (this.getAttribute("debug") === "true") {
      globalThis.__PIXI_APP__ = this;
      // @ts-ignore
      window.__PIXI_DEVTOOLS__ = {
        pixi: PIXI,
        app: this,
      };
    }

    gsap.ticker.add((time, deltaTime, frame) => {
      this.ticker.update();
    });

    this._intersectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (!this._visible) {
            this._visible = true;
            if (this.visible) {
              for (const app of this._linkedVisibility) {
                app.onVisible();
              }
            }
          }
        } else {
          if (this._visible) {
            this._visible = false;
            if (!this.visible) {
              for (const app of this._linkedVisibility) {
                app.onInvisible();
              }
            }
          }
        }
      }
    });
    this._intersectionObserver.observe(this.element);

    const tasklistId = this.getAttribute("tasklist");
    if (tasklistId) {
      Tasklist.fromId(tasklistId, this);
    }

    const id = this.element.getAttribute("id");
    if (id) {
      GlobalEvents.emitApplicationCreated(id, this);
    }

    GlobalEvents.onHandednessChange((handedness) => {
      this.setHandedness(handedness);
    });
  }

  setHandedness(handedness: "left" | "right") {
    const oldHandedness = this.handedness;
    this.handedness = handedness;

    if (oldHandedness !== handedness) {
      this.onHandednessChange();
    }
  }

  onHandednessChange() {}

  linkVisibility(app: Application) {
    this._linkedVisibility.push(app);
    app._linkedVisibility.push(this);
  }

  get visible(): boolean {
    return (
      this._forceVisible || this._linkedVisibility.some((app) => app._visible)
    );
  }

  registerLayout(layout: Positioner & DisplayObject) {
    this.layout = layout;
    this.stage.addChild(this.layout);

    this._resizeObserver = new ResizeObserver(async () => {
      requestAnimationFrame(async () => {
        await this.onResize(this.screen);
        this.ticker.update();
      });
    });
    this._resizeObserver.observe(this.element);
  }

  destroy(
    removeView?: boolean | undefined,
    stageOptions?: boolean | IDestroyOptions | undefined
  ): void {
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
    this._intersectionObserver?.disconnect();
    this._intersectionObserver = undefined;
    for (const tl of this.timelines()) {
      tl.progress(1);
      tl.kill();
    }
    super.destroy(removeView, stageOptions);
  }

  onVisible() {
    this.resume();
    gsap.killTweensOf(this.element);
    this.timeline()
      .to(this.element, {
        opacity: 1,
        duration: 0.5,
      })
      .play();
  }

  onInvisible() {
    this.pause();
    gsap.killTweensOf(this.element);
    this.timeline()
      .to(this.element, {
        opacity: 0.5,
        duration: 0.5,
      })
      .play();
  }

  alwaysVisible() {
    this._forceVisible = true;
  }

  async onResize(screen: Rectangle): Promise<void> {
    this.layout?.arrange(screen);
  }

  pause() {
    for (let tl of this.timelines()) {
      tl.pause();
    }
  }

  resume() {
    for (let tl of this.timelines()) {
      tl.resume();
    }
  }

  get timeScale(): number {
    return gsap.globalTimeline.timeScale();
  }

  set timeScale(value: number) {
    gsap.globalTimeline.timeScale(value);
  }

  timeline(vars?: gsap.TimelineVars): gsap.core.Timeline {
    let tl = gsap.timeline({
      paused: true,
      ...vars,
    });

    tl._application_id = this.id;
    return tl;
  }

  timelines(): (gsap.core.Timeline | gsap.core.Tween)[] {
    return gsap.globalTimeline.getChildren(true).filter((tl) => {
      return (tl as any)._application_id === this.id;
    });
  }

  getAttribute<T = string>(
    name: string,
    converter?: (value: string) => T
  ): T | undefined {
    let value = this.element.getAttribute(name);
    if (value === null) {
      return undefined;
    }
    if (converter) {
      return converter(value);
    }
    return value as unknown as T;
  }

  private timeouts: { [id: number]: boolean } = {};
  private timeoutId = 0;

  private intervals: { [id: number]: boolean } = {};
  private intervalId = 0;

  async sleep(ms: number | Duration): Promise<void> {
    return new Promise((resolve) => {
      if (ms instanceof Duration) {
        ms = ms.ms;
      }
      let tl = this.timeline();
      tl.to({}, { duration: ms / 1000, onComplete: () => resolve() });
      if (this._visible) {
        tl.play();
      }
    });
  }

  setInterval(callback: () => void, ms: number): number {
    let id = this.intervalId++;
    this.intervals[id] = true;

    new Promise<void>(async (resolve) => {
      while (true) {
        if (!this.intervals[id]) {
          break;
        }
        await this.sleep(ms);
        callback();
      }
      delete this.intervals[id];
      resolve();
    });

    return id;
  }

  clearInterval(id: number): void {
    this.intervals[id] = false;
  }

  setTimeout(callback: () => void, ms: number | Duration): number {
    const id = this.timeoutId++;
    this.timeouts[id] = true;

    new Promise<void>(async (resolve) => {
      await this.sleep(ms);
      if (this.timeouts[id]) {
        callback();
      }
      delete this.timeouts[id];
      resolve();
    });

    return id;
  }

  clearTimeout(id: number): void {
    this.timeouts[id] = false;
  }
}
