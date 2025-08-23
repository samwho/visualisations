import { BaseElement } from "../core/BaseElement";
import { div } from "../core/DOM";
import { startViewTransition } from "../core/Utils";
import type { Debugger } from "./Debugger";

export class ArrayViewer<T> extends BaseElement {
  ref!: string;
  values!: T[];

  target!: Debugger;
  grid!: HTMLDivElement;
  annotations: HTMLDivElement[] = [];

  private readonly COLORS = [
    "var(--palette-orange)",
    "var(--palette-green)",
    "var(--palette-dark-blue)",
    "var(--palette-red)",
    "var(--palette-pink)",
  ];

  init() {
    const ref = this.getAttribute("ref");
    if (!ref) {
      throw new Error("Array component requires 'ref' attribute");
    }
    this.ref = ref;

    const targetId = this.getAttribute("debugger-id");
    if (!targetId) {
      throw new Error("Array component requires 'debugger-id' attribute");
    }

    const target = document.getElementById(targetId) as Debugger | null;
    if (!target) {
      throw new Error(`Debugger with id '${targetId}' not found`);
    }
    this.target = target;

    const locations = new Set<string>();
    const annotations = Array.from(this.querySelectorAll("annotation"));
    for (const el of annotations) {
      const name = el.getAttribute("name");
      if (!name) {
        throw new Error("Each <annotation> must have 'name' attribute");
      }

      const location = el.getAttribute("location") || "top";
      locations.add(location);

      let content = name;
      if (el.innerHTML) {
        content = el.innerHTML;
      }

      const annotation = div({
        class: ["annotation", location],
        data: { name },
        role: "presentation",
      });
      annotation.innerHTML = content;
      this.annotations.push(annotation);
    }

    const label = div(
      {
        class: "label",
        data: { name: this.ref },
        role: "presentation",
      },
      this.ref
    );
    const equals = div(
      {
        class: "equals",
        role: "presentation",
      },
      "="
    );
    this.grid = div(
      { class: "grid", role: "presentation" },
      label,
      equals,
      ...this.annotations
    );
    this.replaceChildren(this.grid);

    if (locations.size === 0) {
      this.style.setProperty("--num-rows", "1");
    } else if (locations.size === 1) {
      this.style.setProperty("--num-rows", "2");
    } else if (locations.size === 2) {
      this.style.setProperty("--num-rows", "3");
    }

    if (locations.has("top") && locations.has("bottom")) {
      this.style.setProperty("--top-row", "1");
      this.style.setProperty("--item-row", "2");
      this.style.setProperty("--bottom-row", "3");
    } else if (locations.has("top")) {
      this.style.setProperty("--top-row", "1");
      this.style.setProperty("--item-row", "2");
    } else if (locations.has("bottom")) {
      this.style.setProperty("--bottom-row", "2");
      this.style.setProperty("--item-row", "1");
    }

    this.setInitialValue();

    this.role = "figure";
    this.ariaLabel = `An array visualisation, currently showing the value: ${this.values.join(
      ", "
    )}`;

    this.target.afterInit(() => {
      this.target.onStep(async (line, scope) => {
        await startViewTransition(() => {
          if (scope[this.ref]) {
            this.values = scope[this.ref]!;
            this.updateArrayValues(this.values);
          }

          for (const annotation of this.annotations) {
            const name = annotation.dataset.name!;

            let value: any;
            try {
              value = this.target.evaluateExpression(name, scope);
            } catch (error) {
              annotation.style.visibility = "hidden";
              continue;
            }

            if (typeof value !== "number") {
              throw new Error(
                `Annotation '${name}' must be a number, got ${typeof value}`
              );
            }

            annotation.style.visibility = "visible";
            annotation.style.gridColumn = (value + 3).toString();
          }
        });
      });

      this.target.onRestart(async () => {
        await startViewTransition(() => {
          for (const annotation of this.annotations) {
            annotation.style.visibility = "hidden";
          }
          this.setInitialValue();
        });
      });
    });
  }

  updateArrayValues(values: any[]) {
    this.values = values;
    this.ariaLabel = `An array visualisation, currently showing the value: ${this.values.join(
      ", "
    )}`;
    this.grid.style.setProperty("--num-items", values.length.toString());
    this.grid.querySelectorAll(".item").forEach((item) => item.remove());
    this.grid.append(
      ...this.values.map((value, i) => {
        const numericValue = Number(value);
        const itemDiv = div(
          {
            class: "item",
            style: {
              gridColumn: (i + 3).toString(),
              viewTransitionName: `${this.id}-${value}`,
            },
            data: {
              index: i.toString(),
            },
            role: "presentation",
          },
          String(value)
        );

        // Apply color based on numeric value (1-5)
        if (numericValue >= 1 && numericValue <= 5) {
          const colorIndex = (numericValue - 1) % this.COLORS.length;
          itemDiv.style.backgroundColor = this.COLORS[colorIndex]!;
          itemDiv.style.color = "white";
          itemDiv.style.fontWeight = "bold";
        } else {
          // For values outside 1-5, use default styling with white text
          itemDiv.style.color = "white";
          itemDiv.style.fontWeight = "bold";
        }

        return itemDiv;
      })
    );
  }

  setInitialValue() {
    const initialValues = this.target.debugger.getFirstValueOf(this.ref);
    if (!Array.isArray(initialValues)) {
      throw new Error(
        `Expected array for reference '${
          this.ref
        }', got ${typeof initialValues}`
      );
    }
    this.updateArrayValues(initialValues);
  }
}
