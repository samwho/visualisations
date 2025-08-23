import { BaseElement } from "../core/BaseElement";
import { easeOutCubic } from "../core/Easing";
import { SVG } from "../core/SVG";

export class Hero extends BaseElement {
  private svg!: SVGElement;
  private animationDuration = 2500;
  private staggerDelay = 150;

  init() {
    // Look, I know. This is a fucking monstrosity. I agree with you and I hate
    // myself. However, for reasons beyond my understanding, Firefox on iOS
    // would not load the hero without this convoluted sequence of waits. So
    // they're staying. I don't like it any more than you do.
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.createSVG();
        requestAnimationFrame(() => {
          setTimeout(() => {
            this.startAnimation();
          }, 50);
        });
      }, 50);
    });
  }

  private createSVG() {
    const width = this.clientWidth;
    const height = this.clientHeight;

    const fontSize = width / 8;
    const bigX = 0.1 * width;
    const bigY = height / 2 + fontSize / 4;
    const oX = bigX + fontSize * 1.75;
    const oY = bigY;

    const gridWidth = width / 500;
    const lineWidth = gridWidth * 3;

    const tSpanAnimation = (delay: number) =>
      `<animate attributeName="dy" from="20" to="0" dur="0.3s" begin="${delay}s" fill="freeze"/><animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="${delay}s" fill="freeze"/>`;

    this.svg = SVG.create(
      {
        attributes: {
          width: width,
          height: height,
          viewBox: `0 0 ${width} ${height}`,
        },
      },
      `
        ${this.generateGrowthLines(width, height, lineWidth)}

        <text x="${bigX}" y="${bigY} ${bigY} ${bigY} ${bigY}" class="big-text" style="--font-size: ${fontSize}px">
            <tspan dy="20" opacity="0">B${tSpanAnimation(0)}</tspan>
            <tspan dy="20" opacity="0">i${tSpanAnimation(0.18)}</tspan>
            <tspan dy="20" opacity="0">g${tSpanAnimation(0.36)}</tspan>
        </text>

        <defs>
          <clipPath id="o-clip">
            <path id="o-clip-path" d="M 235 ${oY} L 235 ${oY} L 235 ${oY} Z" />
          </clipPath>
        </defs>
        <text x="${oX}" y="${oY}" class="o-text" font-size="${fontSize}">O</text>
      `
    );

    this.replaceChildren(this.svg);
  }

  private generateGrowthLines(
    width: number,
    height: number,
    lineWidth: number
  ): string {
    const functions = [
      {
        name: "constant",
        color: "constant-line",
        fn: (x: number) => 0,
      },
      {
        name: "log",
        color: "log-line",
        fn: (x: number) => Math.log(x + 1),
      },
      {
        name: "linear",
        color: "linear-line",
        fn: (x: number) => x,
      },
      {
        name: "n-log-n",
        color: "n-log-n-line",
        fn: (x: number) => x * Math.log(x + 1),
      },
      {
        name: "quadratic",
        color: "quadratic-line",
        fn: (x: number) => x * x,
      },
      {
        name: "cubic",
        color: "cubic-line",
        fn: (x: number) => x * x * x,
      },
    ];

    const yPad = 0.1;
    const xPad = -0.1;
    const maxX = 2;
    const maxY = 5;
    const points = 30;

    const lines: string[] = [];

    for (const func of functions) {
      let path = "";

      for (let i = 0; i <= points; i++) {
        const x = xPad + (maxX * i) / points;
        const y = yPad + func.fn(x);

        // If we exceed the maximum Y value, we want to walk back a bit to make
        // sure we get as close to it as possible. This is because the
        // animations are set up in such a way that all lines should reach their
        // destinations at the same time.
        if (y > maxY) {
          let min = xPad + (maxX * (i - 1)) / points;
          let max = xPad + (maxX * i) / points;
          let step = (max - min) / 10;

          for (let i = min; i <= max; i += step) {
            const y = yPad + func.fn(i);
            if (y > maxY) {
              const screenX = (width * x) / maxX;
              const screenY = height - (height * y) / maxY;
              path += ` L ${screenX} ${screenY}`;
            }
            break;
          }

          break;
        }

        const screenX = (width * x) / maxX;
        const screenY = height - (height * y) / maxY;

        if (i === 0) {
          path += `M ${screenX} ${screenY}`;
        } else {
          path += ` L ${screenX} ${screenY}`;
        }
      }

      lines.push(
        `<path class="growth-line ${func.color}" stroke-width="${lineWidth}" d="${path}" data-function="${func.name}" />`
      );
    }

    return lines.join("\n");
  }

  private startAnimation() {
    const lines = this.svg.querySelectorAll(
      ".growth-line"
    ) as NodeListOf<SVGPathElement>;

    lines.forEach((line, index) => {
      const pathLength = line.getTotalLength();

      line.style.strokeDasharray = `${pathLength}`;
      line.style.strokeDashoffset = `${pathLength - 1}`;
      line.style.opacity = "1";

      line.animate(
        [{ strokeDashoffset: pathLength }, { strokeDashoffset: 0 }],
        {
          duration: this.animationDuration - index * this.staggerDelay,
          delay: index * this.staggerDelay,
          easing: "cubic-bezier(0.215, 0.61, 0.355, 1)",
          fill: "forwards",
        }
      );
    });

    setTimeout(() => {
      this.animateOTransformation(
        this.animationDuration - lines.length * this.staggerDelay
      );
    }, lines.length * this.staggerDelay);
  }

  private animateOTransformation(duration: number) {
    const clipPath = this.svg.querySelector("#o-clip-path") as SVGPathElement;
    const oText = this.svg.querySelector(".o-text") as SVGTextElement;

    oText.style.opacity = "1";

    const textBBox = oText.getBBox();
    const centerX = textBBox.x + textBBox.width / 2;
    const centerY = textBBox.y + textBBox.height / 2;
    const radius = Math.max(textBBox.width, textBBox.height) / 2 + 10;

    const start = performance.now();

    const animateStep = () => {
      const elapsed = Math.max(0.01, performance.now() - start);
      let progress = Math.min(1, elapsed / duration);

      if (progress >= 0.99) {
        oText.style.clipPath = "none";
        return;
      }

      const maxAngle = 2 * Math.PI;
      const angle = easeOutCubic(progress) * maxAngle;

      const startAngle = -Math.PI / 2;
      const currentAngle = startAngle - angle;

      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(currentAngle);
      const y2 = centerY + radius * Math.sin(currentAngle);

      const largeArcFlag = angle > Math.PI ? 1 : 0;
      const sweepFlag = 0;

      const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${x2} ${y2} Z`;
      clipPath.setAttribute("d", pathData);

      requestAnimationFrame(animateStep);
    };

    animateStep();
  }
}
