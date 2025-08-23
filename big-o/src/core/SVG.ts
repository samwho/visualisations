// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class SVG {
  static icon(href: string): SVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    svg.innerHTML = `<use href="${href}" />`;
    return svg;
  }

  static spinner(): SVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.ariaLabel = "Animated loading spinner";
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    svg.innerHTML = `
      <style>
        .spinner{
        transform-origin: center;
        animation: rotate 2s linear infinite
        }
        .spinner circle{
        stroke-linecap: round;
        animation: loading 1.5s ease-in-out infinite;
        fill: none;
        stroke-width: 3;
        stroke: currentColor;
        }
        @keyframes rotate{
        100%{
        transform:rotate(360deg)
        }
        }
        @keyframes loading {
        0% {
        stroke-dasharray:0 150;
        stroke-dashoffset:0
        }
        47.5% {
        stroke-dasharray: 42 150;
        stroke-dashoffset: -16
        }
        95%,100% {
        stroke-dasharray: 42 150;
        stroke-dashoffset: -59
        }
        }
      </style>
      <g class="spinner">
        <circle cx="12" cy="12" r="9.5"></circle>
      </g>
    `;
    return svg;
  }

  static play(): SVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.ariaLabel = "Play icon";
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    svg.setAttribute("fill", "currentColor");
    svg.innerHTML = `
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z" />
    `;
    return svg;
  }

  static pause(): SVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.ariaLabel = "Pause icon";
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    svg.setAttribute("fill", "currentColor");
    svg.innerHTML = `
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M9 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
      <path d="M17 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
    `;
    return svg;
  }

  static skipForward(): SVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.ariaLabel = "Skip forward icon";
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    svg.setAttribute("fill", "currentColor");
    svg.innerHTML = `
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M3 5v14a1 1 0 0 0 1.504 .864l12 -7a1 1 0 0 0 0 -1.728l-12 -7a1 1 0 0 0 -1.504 .864z" />
      <path d="M20 4a1 1 0 0 1 .993 .883l.007 .117v14a1 1 0 0 1 -1.993 .117l-.007 -.117v-14a1 1 0 0 1 1 -1z" />
    `;
    return svg;
  }

  static skipBack(): SVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.ariaLabel = "Skip back icon";
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    svg.setAttribute("fill", "currentColor");
    svg.innerHTML = `
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M19.496 4.136l-12 7a1 1 0 0 0 0 1.728l12 7a1 1 0 0 0 1.504 -.864v-14a1 1 0 0 0 -1.504 -.864z" />
      <path d="M4 4a1 1 0 0 1 .993 .883l.007 .117v14a1 1 0 0 1 -1.993 .117l-.007 -.117v-14a1 1 0 0 1 1 -1z" />
    `;
    return svg;
  }

  static restart(): SVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.ariaLabel = "Restart icon";
    svg.setAttribute("viewBox", "0 0 512 512");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    svg.setAttribute("fill", "currentColor");
    svg.innerHTML = `
      <path d="M 485.51724137931035 220.68965517241378 Q 509.7931034482759 218.48275862068965 512 194.20689655172413 L 512 35.310344827586206 L 512 35.310344827586206 Q 509.7931034482759 11.03448275862069 485.51724137931035 8.827586206896552 Q 461.2413793103448 11.03448275862069 459.0344827586207 35.310344827586206 L 459.0344827586207 123.58620689655173 L 459.0344827586207 123.58620689655173 L 436.9655172413793 98.20689655172414 L 436.9655172413793 98.20689655172414 Q 402.7586206896552 56.275862068965516 354.2068965517241 33.10344827586207 Q 304.55172413793105 8.827586206896552 247.17241379310346 8.827586206896552 Q 177.6551724137931 9.931034482758621 122.48275862068965 43.03448275862069 Q 66.20689655172414 75.03448275862068 34.206896551724135 131.31034482758622 Q 1.103448275862069 186.48275862068965 0 256 Q 1.103448275862069 325.51724137931035 34.206896551724135 380.6896551724138 Q 66.20689655172414 436.9655172413793 122.48275862068965 468.9655172413793 Q 177.6551724137931 502.0689655172414 247.17241379310346 503.17241379310343 Q 332.13793103448273 502.0689655172414 395.0344827586207 453.51724137931035 Q 413.7931034482759 436.9655172413793 400.55172413793105 417.1034482758621 Q 384 398.3448275862069 364.13793103448273 411.58620689655174 Q 314.48275862068965 449.1034482758621 247.17241379310346 450.2068965517241 Q 164.41379310344828 448 110.34482758620689 392.82758620689657 Q 55.172413793103445 338.7586206896552 52.96551724137931 256 Q 55.172413793103445 173.24137931034483 110.34482758620689 119.17241379310344 Q 164.41379310344828 64 247.17241379310346 61.793103448275865 Q 292.41379310344826 61.793103448275865 331.0344827586207 80.55172413793103 Q 369.6551724137931 99.3103448275862 396.13793103448273 131.31034482758622 L 396.13793103448273 132.41379310344828 L 396.13793103448273 132.41379310344828 L 396.13793103448273 132.41379310344828 L 396.13793103448273 132.41379310344828 L 427.0344827586207 167.72413793103448 L 427.0344827586207 167.72413793103448 L 326.62068965517244 167.72413793103448 L 326.62068965517244 167.72413793103448 Q 302.3448275862069 169.93103448275863 300.13793103448273 194.20689655172413 Q 302.3448275862069 218.48275862068965 326.62068965517244 220.68965517241378 L 485.51724137931035 220.68965517241378 L 485.51724137931035 220.68965517241378 Z" />
    `;
    return svg;
  }

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
