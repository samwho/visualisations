import { Color, Sprite, Texture } from "pixi.js-legacy";
import { getColor } from "./Colors";

export class SVG {
  static create(
    opts: {
      style?: Partial<CSSStyleDeclaration>;
      attributes?: Record<string, string | number>;
    },
    innerSVG: string
  ): SVGElement {
    const { style = {}, attributes = {} } = opts;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    for (const [key, value] of Object.entries(style)) {
      svg.style[key] = value;
    }

    for (const [key, value] of Object.entries(attributes)) {
      svg.setAttribute(key, value.toString());
    }

    svg.innerHTML = innerSVG;
    return svg;
  }

  static circle(opts?: {
    width?: number;
    height?: number;
    filled?: boolean;
    strokeWidth?: number;
    style?: Partial<CSSStyleDeclaration>;
    cy?: number;
    cx?: number;
    rx?: number;
    ry?: number;
  }): SVGElement {
    const {
      width = 100,
      height = 100,
      filled = true,
      strokeWidth = 0,
      style,
      cx = 50,
      cy = 50,
      rx = 45,
      ry = 45,
    } = opts || {};
    return SVG.create(
      { style, attributes: { width, height, viewBox: "0 0 100 100" } },
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${
        filled ? "currentColor" : "none"
      }" stroke="currentColor" stroke-width="${strokeWidth}" />`
    );
  }

  static stripedCircle(opts?: {
    width?: number;
    height?: number;
    strokeWidth?: number;
    style?: Partial<CSSStyleDeclaration>;
  }): SVGElement {
    const { width = 100, height = 100, strokeWidth = 4, style } = opts || {};
    return SVG.create(
      { style, attributes: { width, height, viewBox: "0 0 100 100" } },
      `
      <defs>
        <pattern x="0" y="0" width="${width / 10}" height="${
        height / 10
      }" patternUnits="userSpaceOnUse" viewBox="0 0 ${width / 10} ${
        height / 10
      }" id="pattern-0">
          <rect width="${width / 20}" height="${
        height / 10
      }" style="fill: currentColor;" y="0" x="0"/>
        </pattern>
      </defs>
      <ellipse style="fill: url('#pattern-0'); fill-rule: nonzero; stroke: currentColor; stroke-width: ${strokeWidth}px;" cx="50" cy="50" rx="45" ry="45"/>
      `
    );
  }

  static roundedSquare(opts?: {
    width?: number;
    height?: number;
    filled?: boolean;
    style?: Partial<CSSStyleDeclaration>;
  }): SVGElement {
    const { width = 100, height = 100, filled = true, style } = opts || {};
    return SVG.square({ width, height, filled, style, rx: 20, ry: 20 });
  }

  static square(opts?: {
    width?: number;
    height?: number;
    filled?: boolean;
    rx?: number;
    ry?: number;
    style?: Partial<CSSStyleDeclaration>;
  }): SVGElement {
    const {
      width = 100,
      height = 100,
      filled = true,
      rx = 0,
      ry = 0,
      style,
    } = opts || {};
    return SVG.create(
      { style, attributes: { width, height, viewBox: "0 0 100 100" } },
      `<rect x="5" y="5" width="90" height="90" rx="${rx}" ry="${ry}" fill="${
        filled ? "currentColor" : "none"
      }" />`
    );
  }

  static pill(opts?: {
    width?: number;
    height?: number;
    style?: Partial<CSSStyleDeclaration>;
  }): SVGElement {
    const { width = 100, height = 100, style } = opts || {};
    return SVG.create(
      {
        style: { ...style, width: "2rem" },
        attributes: { width, height, viewBox: "0 0 200 100" },
      },
      `
      <ellipse style="fill-rule: nonzero; fill: currentColor;" cx="50" cy="50" rx="45" ry="45" />
      <ellipse style="fill-rule: nonzero; fill: currentColor;" cx="150" cy="50" rx="45" ry="45" />
      <rect x="50" y="5" width="100" height="90" style="fill: currentColor" />
      `
    );
  }

  static queue(opts?: {
    width?: number;
    height?: number;
    style?: Partial<CSSStyleDeclaration>;
  }): SVGElement {
    const { width = 100, height = 100, style } = opts || {};
    return SVG.create(
      {
        style: { ...style, width: "2rem" },
        attributes: { width, height, viewBox: "0 0 200 100" },
      },
      `
      <ellipse style="fill-rule: nonzero; fill: currentColor;" cx="50" cy="50" rx="45" ry="45" />
      <ellipse style="fill-rule: nonzero; fill: currentColor;" cx="150" cy="50" rx="45" ry="45" />
      <rect x="50" y="5" width="100" height="90" style="fill: currentColor" />
      <!--<circle cx="150" cy="50" r="30" fill="${getColor(
        0
      ).toRgbaString()}" />-->
      `
    );
  }

  static triangle(opts?: {
    width?: number;
    height?: number;
    filled?: boolean;
    style?: Partial<CSSStyleDeclaration>;
  }): SVGElement {
    const { width = 100, height = 100, filled = true, style } = opts || {};
    return SVG.create(
      { style, attributes: { width, height, viewBox: "0 0 100 100" } },
      `<polygon points="50,5 95,95 5,95" fill="${
        filled ? "currentColor" : "none"
      }" />`
    );
  }

  static diamond(opts?: {
    width?: number;
    height?: number;
    filled?: boolean;
    style?: Partial<CSSStyleDeclaration>;
  }): SVGElement {
    const { width = 100, height = 100, filled = true, style } = opts || {};
    return SVG.create(
      { style, attributes: { width, height, viewBox: "0 0 100 100" } },
      `<polygon points="50,5 95,50 50,95 5,50" fill="${
        filled ? "currentColor" : "none"
      }" />`
    );
  }

  static toSprite(svg: SVGElement): Sprite {
    const svgCopy = svg.cloneNode(true) as SVGElement;
    const originalColor = svgCopy.style.color;
    svgCopy.style.color = "white";

    const texture = Texture.from(svgCopy.outerHTML);
    const sprite = new Sprite(texture);

    if (originalColor) {
      sprite.tint = new Color(originalColor).toNumber();
    }
    sprite.anchor.x = sprite.width / 2;
    sprite.anchor.y = sprite.height / 2;
    return sprite;
  }
}
