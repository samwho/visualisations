import type { Group } from "@tweenjs/tween.js";
import type { Path } from "two.js/src/path";
import type { Shape } from "two.js/src/shape";

export function sortBy<T>(array: T[], ...keys: (keyof T)[]): T[] {
  return array.toSorted((a, b) => {
    for (const key of keys) {
      // hack to always sort "*" to the end in programs
      if (key === "read" && b[key] === "*") {
        return -1;
      }
      if (a[key] < b[key]) return -1;
      if (a[key] > b[key]) return 1;
    }
    return 0;
  });
}

export function roughlyEqual(a: number, b: number, epsilon = 0.1) {
  return Math.abs(a - b) < epsilon;
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getElement(shape: Path): SVGPathElement;
export function getElement(shape: Group): SVGGElement;
export function getElement(shape: Shape | Group): SVGElement {
  // @ts-expect-error
  return shape._renderer.elem as SVGElement;
}
