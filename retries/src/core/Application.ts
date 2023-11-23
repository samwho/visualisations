import {
  IDestroyOptions,
  Application as PixiApplication,
} from "pixi.js-legacy";
import { gsap } from "gsap";
import GUI from "lil-gui";
import Duration from "../utils/Duration";

export default class Application extends PixiApplication {
  static nextId: number = 0;
  id: number = Application.nextId++;
  debug: GUI | null = null;
  root: HTMLElement;
  element: HTMLElement;
  intersectionObserver: IntersectionObserver;
  renderFn: () => void;

  constructor({ root, element }: { root: HTMLElement; element: HTMLElement }) {
    super({
      backgroundAlpha: 0,
      resizeTo: element,
      antialias: true,
      autoDensity: true,
      autoStart: false,
      resolution: 2,
      forceCanvas: true,
    });

    this.renderer.plugins.interaction.autoPreventDefault = false;
    this.renderer.view.style!.touchAction = "auto";
    this.stage.interactiveChildren = false;

    this.root = root;
    this.element = element;

    // @ts-ignore
    element.appendChild(this.view);

    element.style.position = "relative";

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

    this.renderFn = () => this.ticker.update();
    this.ticker.stop();

    let paused: (gsap.core.Timeline | gsap.core.Tween)[] = [];
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (let entry of entries) {
          if (entry.isIntersecting) {
            gsap.ticker.add(this.renderFn);
            for (let tl of paused) {
              tl.play();
            }
            paused = [];
          } else {
            for (let tl of this.timelines()) {
              if (!tl.paused()) {
                paused.push(tl);
                tl.pause();
              }
            }
            gsap.ticker.remove(this.renderFn);
          }
        }
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.0,
      }
    );
    this.intersectionObserver.observe(element);
  }

  destroy(
    removeView?: boolean | undefined,
    stageOptions?: boolean | IDestroyOptions | undefined
  ): void {
    super.destroy(removeView, stageOptions);
    this.intersectionObserver.disconnect();
    gsap.ticker.remove(this.renderFn);
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

  async onAttributeChange(name: string, value: string): Promise<void> {}

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
