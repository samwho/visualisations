import { INSTRUCTION, STATE, VALUE } from "./Colors";

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class SVG {
  static create(
    opts: {
      style?: Partial<CSSStyleDeclaration>;
      attributes?: Record<string, string | number>;
      role?: string;
    },
    innerSVG: string,
  ): SVGElement {
    const { style = {}, attributes = {}, role = "presentation" } = opts;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("role", role);

    for (const [key, value] of Object.entries(style)) {
      // @ts-expect-error
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
      }" stroke="currentColor" stroke-width="${strokeWidth}" />`,
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
      `,
    );
  }

  static roundedRect(opts?: {
    width?: number;
    height?: number;
    fill?: string;
    fillOpacity?: number;
    stroke?: string;
    strokeWidth?: number;
    strokeOpacity?: number;
    style?: Partial<CSSStyleDeclaration>;
    rx?: number;
    ry?: number;
  }): SVGElement {
    const {
      width = 100,
      height = 100,
      fill = "currentColor",
      fillOpacity = 1,
      stroke = "none",
      strokeWidth = 0,
      strokeOpacity = 1,
      style,
      rx = 20,
      ry = 20,
    } = opts || {};
    return SVG.rect({
      width,
      height,
      fill,
      fillOpacity,
      stroke,
      strokeWidth,
      strokeOpacity,
      style,
      rx,
      ry,
    });
  }

  static rect(opts?: {
    width?: number;
    height?: number;
    fill?: string;
    fillOpacity?: number;
    stroke?: string;
    strokeWidth?: number;
    strokeOpacity?: number;
    rx?: number;
    ry?: number;
    padding?: number;
    style?: Partial<CSSStyleDeclaration>;
  }): SVGElement {
    const {
      width = 100,
      height = 100,
      rx = 0,
      ry = 0,
      padding = 5,
      fill = "currentColor",
      fillOpacity = 1,
      stroke = "none",
      strokeWidth = 0,
      strokeOpacity = 1,
      style,
    } = opts || {};
    return SVG.create(
      {
        style,
        attributes: { width, height, viewBox: `0 0 ${width} ${height}` },
      },
      `<rect
         x="${padding}"
         y="${padding}"
         width="${width - padding * 2}"
         height="${height - padding * 2}"
         rx="${rx}"
         ry="${ry}"
         fill="${fill}"
         fill-opacity="${fillOpacity}"
         stroke="${stroke}"
         stroke-width="${strokeWidth}"
         stroke-opacity="${strokeOpacity}"
      />`,
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
      }" />`,
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
      }" />`,
    );
  }

  static heart(opts?: {
    width?: number;
    height?: number;
    style?: Partial<CSSStyleDeclaration>;
  }): SVGElement {
    const { width = 100, height = 100, style } = opts || {};
    return SVG.create(
      {
        style,
        attributes: { width, height, viewBox: "0 0 24 24" },
      },
      `<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" />`,
    );
  }

  static tape(opts?: {
    width?: number;
    height?: number;
    style?: Partial<CSSStyleDeclaration>;
  }): SVGElement {
    const { width = 300, height = 100, style } = opts || {};
    return SVG.create(
      { style, attributes: { width, height, viewBox: "0 0 300 100" } },
      `
      <rect x="10"  y="10" width="90" height="80" fill="none" stroke="currentColor" stroke-width="10" />
      <rect x="100" y="10" width="90" height="80" fill="none" stroke="currentColor" stroke-width="10" />
      <rect x="190" y="10" width="90" height="80" fill="none" stroke="currentColor" stroke-width="10" />
      `,
    );
  }

  static grid(opts?: {
    width?: number;
    height?: number;
    style?: Partial<CSSStyleDeclaration>;
  }): SVGElement {
    const { width = 300, height = 300, style } = opts || {};
    return SVG.create(
      { style, attributes: { width, height, viewBox: "0 0 300 300" } },
      `
        <rect x="10"  y="10"  width="90" height="90"
          fill="${STATE.hex()}" stroke="currentColor" stroke-width="10" />
        <rect x="100" y="10"  width="90" height="90"
          fill="none" stroke="currentColor" stroke-width="10" />
        <rect x="190" y="10"  width="90" height="90"
          fill="none" stroke="currentColor" stroke-width="10" />
        <rect x="10"  y="100" width="90" height="90"
          fill="none" stroke="currentColor" stroke-width="10" />
        <rect x="100" y="100" width="90" height="90"
          fill="none" stroke="currentColor" stroke-width="10" />
        <rect x="190" y="100" width="90" height="90"
          fill="${INSTRUCTION.hex()}" stroke="currentColor" stroke-width="10" />
        <rect x="10"  y="190" width="90" height="90"
          fill="none" stroke="currentColor" stroke-width="10" />
        <rect x="100" y="190" width="90" height="90"
          fill="${VALUE.hex()}" stroke="currentColor" stroke-width="10" />
        <rect x="190" y="190" width="90" height="90"
          fill="none" stroke="currentColor" stroke-width="10" />
      `,
    );
  }
}
