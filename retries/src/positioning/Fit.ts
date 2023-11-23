import { Rectangle, Container } from "pixi.js-legacy";
import Positioner from "./Positioner";

export default class Fit extends Container implements Positioner {
  child: Container;
  padding: number | string;
  maxWidth: number | string;
  maxHeight: number | string;
  minWidth: number | string;
  minHeight: number | string;

  constructor(
    child: Container,
    {
      padding,
      maxWidth,
      maxHeight,
      minWidth,
      minHeight,
    }: {
      padding?: number | string;
      maxWidth?: number | string;
      maxHeight?: number | string;
      minWidth?: number | string;
      minHeight?: number | string;
    } = {}
  ) {
    super();
    this.child = child;
    this.padding = padding ?? 0;
    this.maxWidth = maxWidth ?? Infinity;
    this.maxHeight = maxHeight ?? Infinity;
    this.minWidth = minWidth ?? 0;
    this.minHeight = minHeight ?? 0;
    this.addChild(child);
  }

  _getDimension(value: number | string, reference: number): number {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string" && value.endsWith("%")) {
      return reference * (parseFloat(value) / 100);
    }
    throw new Error(`Invalid value: ${value}`);
  }

  arrange(space: Rectangle): void {
    try {
      // It's possible that the child's transform has not yet been created. If
      // that's the case, we can't do anything.
      this.child.width;
    } catch (e) {
      return;
    }

    let padding = this._getDimension(
      this.padding,
      Math.min(space.width, space.height)
    );
    let maxWidth = this._getDimension(this.maxWidth, space.width);
    let maxHeight = this._getDimension(this.maxHeight, space.height);
    let minWidth = this._getDimension(this.minWidth, space.width);
    let minHeight = this._getDimension(this.minHeight, space.height);

    let spaceWidth = Math.max(space.width - padding * 2);
    let spaceHeight = Math.max(1, space.height - padding * 2);

    let width = this.child.width;
    let height = this.child.height;

    let containerAspectRatio = spaceWidth / spaceHeight;
    let aspectRatio = width / height;

    if (containerAspectRatio > aspectRatio) {
      width = spaceHeight * aspectRatio;
      height = spaceHeight;
    } else {
      height = spaceWidth * aspectRatio;
      width = spaceWidth;
    }

    if (width > maxWidth) {
      width = maxWidth;
      height = maxWidth * aspectRatio;
    }
    if (height > maxHeight) {
      height = maxHeight;
      width = maxHeight * aspectRatio;
    }
    if (width < minWidth) {
      width = minWidth;
      height = minWidth * aspectRatio;
    }
    if (height < minHeight) {
      height = minHeight;
      width = minHeight * aspectRatio;
    }

    this.child.width = width;
    this.child.height = height;
  }
}
