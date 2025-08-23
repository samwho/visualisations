import { BaseElement } from "../core/BaseElement";
import { button, div } from "../core/DOM";
import { SVG } from "../core/SVG";

interface NumberElement {
  value: number;
  circle: SVGCircleElement;
  text: SVGTextElement;
  currentX: number;
  currentY: number;
  fullPath: SVGPathElement;
  columnPositions: number[];
  totalPathLength: number;
}

export class SortGrid extends BaseElement {
  private originalArray: number[] = [];
  private iterations: number[][] = [];
  private currentIteration: number = 0;
  private animationDuration: number = 1000;

  private svgContainer!: SVGSVGElement;
  private stepButton!: HTMLButtonElement;
  private stepBackButton!: HTMLButtonElement;
  private bestButton!: HTMLButtonElement;
  private worstButton!: HTMLButtonElement;
  private randomButton!: HTMLButtonElement;
  private numberElements: NumberElement[] = [];

  // Aspect ratio and viewBox configuration
  private readonly VIEWBOX_WIDTH = 800;
  private readonly VIEWBOX_HEIGHT = 600;

  // Dynamic layout properties (calculated based on array size and iterations)
  private circleRadius = 0;
  private margin = 0;
  private horizontalMargin = 0;
  private fontSize = 0;
  private columnWidth = 0;
  private rowHeight = 0;

  private readonly easing = "cubic-bezier(0.33, 1, 0.68, 1)";

  private readonly COLORS = [
    "var(--palette-orange)",
    "var(--palette-green)",
    "var(--palette-dark-blue)",
    "var(--palette-red)",
    "var(--palette-pink)",
  ];

  init() {
    const arrayData = this.getAttribute("array") || "5,3,8,1,4,7,2,6";
    const array = arrayData.split(",").map((n) => parseInt(n.trim()));
    this.initWith(array);
  }

  private calculateLayoutDimensions() {
    // Small gap between circles (in pixels)
    const gapBetweenCircles = 25;

    // Calculate circle radius to fill vertical space
    // Total vertical space needed: (numElements * 2 * radius) + ((numElements - 1) * gap)
    // Solving for radius: radius = (availableHeight - gaps) / (2 * numElements)
    const totalGaps = (this.originalArray.length - 1) * gapBetweenCircles;
    this.circleRadius =
      (this.VIEWBOX_HEIGHT - totalGaps) / (2 * this.originalArray.length);

    // Ensure reasonable bounds for circle radius
    this.circleRadius = Math.max(5, Math.min(50, this.circleRadius));

    // Set vertical margin and calculate row height
    this.rowHeight = this.circleRadius * 2 + gapBetweenCircles;

    // Calculate font size based on circle radius
    this.fontSize = this.circleRadius * 0.75;

    // Calculate horizontal layout - ensure circles fit completely within viewbox
    this.horizontalMargin = this.circleRadius + 10;
    const availableWidth = this.VIEWBOX_WIDTH - 2 * this.horizontalMargin;

    // Calculate column width based on worst-case bubble sort iterations
    // Worst case: initial + n passes + final no-swap pass = n+1 total iterations
    // So we need n gaps between n+1 columns
    const maxColumns = this.originalArray.length + 1; // +1 for final verification pass
    if (maxColumns <= 1) {
      this.columnWidth = 0;
    } else {
      this.columnWidth = availableWidth / (maxColumns - 1);
    }

    // Ensure minimum column spacing
    const minColumnWidth = this.circleRadius * 2.5;
    this.columnWidth = Math.max(this.columnWidth, minColumnWidth);
  }

  private addColumnLines() {
    // Add vertical lines for each column position (worst-case scenario)
    const maxColumns = this.originalArray.length + 1; // +1 for final verification pass
    for (let i = 0; i < maxColumns; i++) {
      const x = this.horizontalMargin + i * this.columnWidth;

      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      line.setAttribute("x1", x.toString());
      line.setAttribute("y1", "0");
      line.setAttribute("x2", x.toString());
      line.setAttribute("y2", this.VIEWBOX_HEIGHT.toString());
      line.setAttribute("stroke", "black");
      line.setAttribute("stroke-width", "3");
      line.setAttribute("opacity", "0.2");
      line.setAttribute("stroke-dasharray", "10,10");

      this.svgContainer.appendChild(line);
    }
  }

  initWith(array: number[]) {
    this.currentIteration = 0;
    this.originalArray = array;
    this.generateBubbleSortIterations();
    this.createUI();
    this.createNumberElements();
    this.setAria();
  }

  private generateBubbleSortIterations() {
    this.iterations = [[...this.originalArray]];

    const array = [...this.originalArray];
    const n = array.length;

    while (true) {
      let swapped = false;
      for (let j = 0; j < n - 1; j++) {
        if (array[j]! > array[j + 1]!) {
          [array[j]!, array[j + 1]!] = [array[j + 1]!, array[j]!];
          swapped = true;
        }
      }

      this.iterations.push([...array]);
      if (!swapped) break;
    }
  }

  private createUI() {
    this.stepButton = button(
      {
        onclick: async () => {
          if (this.currentIteration === this.iterations.length - 2) {
            this.stepButton.disabled = true;
          }
          this.stepBackButton.disabled = false;
          await this.step();
        },
        ariaLabel: "Step forward",
      },
      SVG.skipForward()
    );
    this.stepBackButton = button(
      {
        onclick: async () => {
          if (this.currentIteration === 1) {
            this.stepBackButton.disabled = true;
          }
          this.stepButton.disabled = false;
          await this.stepBack();
        },
        disabled: true,
        ariaLabel: "Step back",
      },
      SVG.skipBack()
    );
    this.bestButton = button(
      {
        onclick: async () => {
          this.originalArray.sort((a, b) => a - b);
          this.initWith(this.originalArray);
        },
        ariaLabel: "Best case",
      },
      "Best"
    );
    this.worstButton = button(
      {
        onclick: async () => {
          this.originalArray.sort((a, b) => b - a);
          this.initWith(this.originalArray);
        },
        ariaLabel: "Worst case",
      },
      "Worst"
    );
    this.randomButton = button(
      {
        onclick: async () => {
          this.originalArray.sort(() => Math.random() - 0.5);
          this.initWith(this.originalArray);
        },
        ariaLabel: "Random case",
      },
      "Rand"
    );
    const leftControls = div(
      ".controls-left",
      this.bestButton,
      this.worstButton,
      this.randomButton
    );

    const rightControls = div(
      ".controls-right",
      this.stepBackButton,
      this.stepButton
    );

    const controls = div(".controls", leftControls, rightControls);

    this.calculateLayoutDimensions();

    this.svgContainer = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    this.svgContainer.role = "presentation";

    // Use fixed viewBox dimensions
    this.svgContainer.setAttribute(
      "viewBox",
      `0 0 ${this.VIEWBOX_WIDTH} ${this.VIEWBOX_HEIGHT}`
    );

    // Set container dimensions based on aspect ratio
    this.svgContainer.style.width = "100%";
    this.svgContainer.style.height = "auto";
    this.svgContainer.style.aspectRatio = `${this.VIEWBOX_WIDTH} / ${this.VIEWBOX_HEIGHT}`;

    // Add faint vertical lines at column positions
    this.addColumnLines();

    this.replaceChildren(this.svgContainer, controls);
  }

  private generateFullPathForElement(value: number): {
    path: SVGPathElement;
    columnPositions: number[];
    totalLength: number;
  } {
    const columnPositions: number[] = [];
    let pathData = "";

    // Track positions of this value through all iterations
    const positions: Array<{ x: number; y: number }> = [];

    for (
      let iterationIndex = 0;
      iterationIndex < this.iterations.length;
      iterationIndex++
    ) {
      const iteration = this.iterations[iterationIndex]!;
      const arrayIndex = iteration.indexOf(value);

      const x = this.horizontalMargin + iterationIndex * this.columnWidth;
      const y = this.margin + arrayIndex * this.rowHeight + this.circleRadius;

      positions.push({ x, y });
    }

    // Create path data
    if (positions.length > 0) {
      pathData = `M ${positions[0]!.x} ${positions[0]!.y}`;
      for (let i = 1; i < positions.length; i++) {
        pathData += ` L ${positions[i]!.x} ${positions[i]!.y}`;
      }
    }

    // Create the path element
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);

    // Color the path based on the numeric value
    const colorIndex = value % this.COLORS.length;
    path.setAttribute("stroke", this.COLORS[colorIndex]!);
    path.setAttribute("stroke-width", "3");
    path.setAttribute("fill", "none");
    path.setAttribute("opacity", "1");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("stroke-linecap", "round");

    // Calculate total length and column positions
    const totalLength = path.getTotalLength();

    // Calculate cumulative distances for each column
    for (let i = 0; i < positions.length; i++) {
      if (i === 0) {
        columnPositions.push(0);
      } else {
        // Create a temporary path up to this point
        let tempPathData = `M ${positions[0]!.x} ${positions[0]!.y}`;
        for (let j = 1; j <= i; j++) {
          tempPathData += ` L ${positions[j]!.x} ${positions[j]!.y}`;
        }
        const tempPath = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        tempPath.setAttribute("d", tempPathData);
        columnPositions.push(tempPath.getTotalLength());
      }
    }

    return { path, columnPositions, totalLength };
  }

  private createNumberElements() {
    this.numberElements = [];

    this.originalArray.forEach((value, index) => {
      const initialX = this.horizontalMargin;
      const initialY = this.margin + index * this.rowHeight + this.circleRadius;

      const pathInfo = this.generateFullPathForElement(value);

      const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
      );
      circle.setAttribute("cx", initialX.toString());
      circle.setAttribute("cy", initialY.toString());
      circle.setAttribute("r", this.circleRadius.toString());

      // Color the circle based on the numeric value
      const colorIndex = value % this.COLORS.length;
      circle.setAttribute("fill", this.COLORS[colorIndex]!);
      circle.classList.add("sort-circle");

      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      text.setAttribute("x", initialX.toString());
      text.setAttribute("y", (initialY + this.fontSize * 0.1).toString());
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-family", "var(--code-font)");
      text.setAttribute("font-size", this.fontSize.toString());
      text.setAttribute("font-weight", "bold");
      text.setAttribute("fill", "white");
      text.textContent = value.toString();

      pathInfo.path.setAttribute(
        "stroke-dasharray",
        (pathInfo.totalLength + 1).toString()
      );
      pathInfo.path.setAttribute(
        "stroke-dashoffset",
        pathInfo.totalLength.toString()
      );

      this.svgContainer.appendChild(pathInfo.path);
      this.svgContainer.appendChild(circle);
      this.svgContainer.appendChild(text);

      this.numberElements.push({
        value,
        circle,
        text,
        fullPath: pathInfo.path,
        columnPositions: pathInfo.columnPositions,
        totalPathLength: pathInfo.totalLength,
        currentX: initialX,
        currentY: initialY,
      });
    });
  }

  private async animateToColumn(
    numberElement: NumberElement,
    targetColumn: number
  ) {
    const targetIteration = this.iterations[targetColumn];
    if (!targetIteration) return;

    const targetPathLength = numberElement.columnPositions[targetColumn] || 0;
    const targetOffset = numberElement.totalPathLength - targetPathLength;

    const arrayIndex = targetIteration.indexOf(numberElement.value);
    const targetX = this.horizontalMargin + targetColumn * this.columnWidth;
    const targetY =
      this.margin + arrayIndex * this.rowHeight + this.circleRadius;

    const animations: Animation[] = [];

    animations.push(
      numberElement.fullPath.animate(
        [{ strokeDashoffset: targetOffset.toString() }],
        {
          duration: this.animationDuration,
          easing: this.easing,
          fill: "forwards",
        }
      )
    );

    const totalDeltaX = targetX - this.horizontalMargin;
    const totalDeltaY =
      targetY -
      (this.margin +
        this.originalArray.indexOf(numberElement.value) * this.rowHeight +
        this.circleRadius);

    for (const el of [numberElement.circle, numberElement.text]) {
      animations.push(
        el.animate(
          [
            {
              transform: `translate(${totalDeltaX}px, ${totalDeltaY}px)`,
            },
          ],
          {
            duration: this.animationDuration,
            easing: this.easing,
            fill: "forwards",
          }
        )
      );
    }

    await Promise.all(animations.map((a) => a.finished));
  }

  private async step() {
    if (this.currentIteration === this.iterations.length) {
      return false;
    }

    this.currentIteration++;
    const targetIteration = this.iterations[this.currentIteration];
    if (!targetIteration) return false;

    const promises: Promise<void>[] = [];

    for (const [arrayIndex, value] of targetIteration.entries()) {
      const el = this.numberElements.find((ne) => ne.value === value);
      if (!el) throw new Error(`Element for value ${value} not found`);

      const targetX =
        this.horizontalMargin + this.currentIteration * this.columnWidth;
      const targetY =
        this.margin + arrayIndex * this.rowHeight + this.circleRadius;

      promises.push(this.animateToColumn(el, this.currentIteration));
      el.currentX = targetX;
      el.currentY = targetY;
    }

    await Promise.all(promises);
    this.setAria();
    return true;
  }

  setAria() {
    const currentArray = this.iterations[this.currentIteration]!;
    this.role = "figure";
    this.ariaLabel = `A visualisation of the bubble sort algorithm, currently showing step ${
      this.currentIteration
    } of ${
      this.iterations.length - 1
    }, with the array being: ${currentArray.join(", ")}`;
  }

  private async stepBack() {
    if (this.currentIteration === 0) {
      return false;
    }

    this.currentIteration--;
    const targetIteration = this.iterations[this.currentIteration];
    if (!targetIteration) return false;

    const promises: Promise<void>[] = [];

    for (const [arrayIndex, value] of targetIteration.entries()) {
      const el = this.numberElements.find((ne) => ne.value === value);
      if (!el) throw new Error(`Element for value ${value} not found`);

      promises.push(this.animateToColumn(el, this.currentIteration));
    }

    await Promise.all(promises);
    this.setAria();
    return true;
  }
}
