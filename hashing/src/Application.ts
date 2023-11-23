import { Application as PixiApplication } from "pixi.js-legacy";
import { gsap } from "gsap";

export default class Application extends PixiApplication {
  root: HTMLElement;
  element: HTMLElement;
  _animations: number;

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

    this.root = root;
    this.element = element;
    element.appendChild(this.view);

    this._animations = 0;
    this.ticker.stop();
    gsap.ticker.add(() => {
      if (this._animations === 0) {
        return;
      }
      this.ticker.update();
    });
  }

  timeline(vars?: gsap.TimelineVars): gsap.core.Timeline {
    return gsap.timeline({
      paused: true,
      autoRemoveChildren: true,
      onStart: () => {
        this._animations++;
      },
      onComplete: () => {
        if (this._animations <= 0) {
          throw new Error("Animations count is negative");
        }
        this._animations--;
      },
      ...vars,
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
}
