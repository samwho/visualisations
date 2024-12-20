// @ts-expect-error
import HTMLParsedElement from "html-parsed-element";
import GUI from "lil-gui";
import { default as Two } from "two.js";
import { Events, type EventHandler, type GlobalRegistry } from "./Events";
import { div } from "./DOM";

const { withParsedCallback } = HTMLParsedElement;

let id = 0;
function getUniqueID(): string {
  return `element-${id++}`;
}

class _BaseElement extends HTMLElement {
  two: Two;
  gui?: GUI;
  debug: boolean;
  container: HTMLDivElement;
  svgContainer: HTMLDivElement;
  svg: SVGElement;
  connected = false;

  private onDisconnectCallbacks: (() => void)[] = [];

  get stylesheet(): CSSStyleSheet {
    return this.svg.querySelector("style")!.sheet!;
  }

  async dispatch<T extends keyof GlobalRegistry>(
    type: T,
    event: Omit<GlobalRegistry[T], "source">,
  ) {
    await Events.dispatch(type, { ...event, source: this });
  }

  async on<T extends keyof GlobalRegistry>(
    type: T,
    listener: EventHandler<GlobalRegistry[T]>,
  ) {
    Events.on(type, listener, { from: this });
  }

  async once<T extends keyof GlobalRegistry>(
    type: T,
    listener: EventHandler<GlobalRegistry[T]>,
  ) {
    Events.once(type, listener, { from: this });
  }

  parsedCallback() {
    this.connected = true;
    if (!this.id) {
      this.id = getUniqueID();
    }

    this.debug = this.getAttribute("debug") === "true";
    this.svgContainer = div({ classes: ["svg-container"] });
    this.container = div({ classes: ["container"] });

    if (this.debug) {
      this.gui = new GUI({
        container: this,
        width: this.clientWidth,
      });
    }

    this.two = new Two({
      type: Two.Types.svg,
      width: this.clientWidth,
      autostart: true,
    }).appendTo(this.svgContainer);

    this.container.appendChild(this.svgContainer);
    this.appendChild(this.container);

    this.svg = this.two.renderer.domElement as SVGElement;

    const style = document.createElement("style");
    this.svg.appendChild(style);

    const elementObserver = new ResizeObserver((entries) => {
      this.onResize();
    });
    elementObserver.observe(this);

    this.onDisconnect(() => elementObserver.disconnect());

    const windowResizeHandler = async () => {
      await this.onPageResize();
    };
    window.addEventListener("resize", windowResizeHandler);

    this.onDisconnect(() => {
      window.removeEventListener("resize", windowResizeHandler);
    });

    const intersectionObserver = new IntersectionObserver(
      async (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            await this.onVisible();
          } else {
            await this.onHidden();
          }
        }
      },
      {
        threshold: 0,
        rootMargin: "5px",
      },
    );
    intersectionObserver.observe(this);

    this.onDisconnect(() => {
      intersectionObserver.disconnect();
    });

    this.init();
  }

  onDisconnect(callback: () => void) {
    this.onDisconnectCallbacks.push(callback);
  }

  disconnectedCallback() {
    this.connected = false;
    for (const callback of this.onDisconnectCallbacks) {
      callback();
    }
  }

  async init() {}

  async onResize() {}
  async onPageResize() {}

  async onVisible() {}
  async onHidden() {}
}

export const BaseElement = withParsedCallback(
  _BaseElement,
) as typeof _BaseElement;
