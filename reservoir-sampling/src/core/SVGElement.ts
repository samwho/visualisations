import { BaseElement } from "./BaseElement";

export class SVGElement extends BaseElement {
  svg!: SVGSVGElement;

  init(): void {
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.appendChild(this.svg);

    this.svg.setAttribute("style", "width: 100%; height: 100%;");
    this.svg.setAttribute(
      "viewBox",
      `0 0 ${this.clientWidth} ${this.clientHeight}`
    );
    this.onResize(() => {
      this.svg.setAttribute(
        "viewBox",
        `0 0 ${this.clientWidth} ${this.clientHeight}`
      );
    });
  }
}
