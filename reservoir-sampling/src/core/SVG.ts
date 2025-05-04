// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class SVG {
  static create(
    opts: {
      style?: Partial<CSSStyleDeclaration>;
      attributes?: Record<string, string | number>;
      role?: string;
    },
    innerSVG: string
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
      `<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" />`
    );
  }
}
