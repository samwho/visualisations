import {
  DisplayObject,
  IDestroyOptions,
  Application as PixiApplication,
  Rectangle,
} from "pixi.js-legacy";
import { gsap } from "gsap";
import GUI from "lil-gui";
import Duration from "./Duration";
import { Positioner } from "pixijs-layout";

export default class Application extends PixiApplication {
  static nextId: number = 0;
  id: number = Application.nextId++;
  debug: GUI | null = null;
  root: HTMLElement;
  element: HTMLElement;
  resizeObserver: ResizeObserver | null = null;
  layout: (Positioner & DisplayObject) | null = null;

  _animationFrame: number | null = null;
  _previousWidth: number = 0;

  constructor({ root, element }: { root: HTMLElement; element: HTMLElement }) {
    super({
      backgroundAlpha: 0,
      resizeTo: element,
      antialias: true,
      autoDensity: true,
      autoStart: false,
      forceCanvas: true,
    });

    // this.renderer.plugins.interaction.autoPreventDefault = false;
    this.renderer.view.style!.touchAction = "auto";
    this.stage.interactiveChildren = false;

    this.root = root;
    this.element = element;

    // @ts-ignore
    element.appendChild(this.view);

    element.style.position = "relative";

    if (this.getAttribute("debug-pixijs") === "true") {
      globalThis.__PIXI_APP__ = this;
    }

    if (this.getAttribute("debug-ui") === "true") {
      let debugDiv = document.createElement("div");
      element.prepend(debugDiv);

      debugDiv.style.position = "absolute";
      debugDiv.style.top = "0";

      this.debug = new GUI({ container: debugDiv });
      this.debug.close();
      this.debug.domElement.style.display =
        this.getAttribute("debug-ui") === "true" ? "block" : "none";

      this.debug.add(this, "timeScale", 0, 3, 0.1).name("Speed");

      let lilguiStyle: HTMLStyleElement | null = null;
      for (let style of document.querySelectorAll("style")) {
        if (style.innerText.includes("lil-gui")) {
          lilguiStyle = style;
          break;
        }
      }

      root.shadowRoot!.prepend(lilguiStyle!.cloneNode(true));
    }

    this.ticker.stop();
    gsap.ticker.add((time, deltaTime, frame) => {
      this.ticker.update();
    });
  }

  registerLayout(layout: Positioner & DisplayObject) {
    this.layout = layout;
    this.stage.addChild(this.layout);
    this.layout.arrange(this.screen);
    this.resizeObserver = new ResizeObserver(async () => {
      const widthChanged = this._previousWidth !== this.element.clientWidth;
      if (this._animationFrame === null && widthChanged) {
        this._animationFrame = requestAnimationFrame(async () => {
          await this.onResize(this.screen);
          this._previousWidth = this.element.clientWidth;
          this.ticker.update();
          this._animationFrame = null;
        });
      }
    });
    this.resizeObserver.observe(this.element);
  }

  destroy(
    removeView?: boolean | undefined,
    stageOptions?: boolean | IDestroyOptions | undefined
  ): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    super.destroy(removeView, stageOptions);
  }

  async onResize(screen: Rectangle): Promise<void> {
    if (this.layout) {
      this.layout.arrange(screen);
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
  ): T | null {
    let value = this.root.getAttribute(name);
    if (value === null) {
      return null;
    }
    if (converter) {
      return converter(value);
    }
    return value as unknown as T;
  }

  async sleep(ms: number | Duration): Promise<void> {
    return new Promise((resolve) => {
      if (ms instanceof Duration) {
        ms = ms.ms;
      }
      let tl = this.timeline();
      tl.to({}, { duration: ms / 1000, onComplete: () => resolve() });
      tl.play();
    });
  }

  async setInterval(callback: () => void, ms: number): Promise<void> {
    while (true) {
      await this.sleep(ms);
      callback();
    }
  }
}
