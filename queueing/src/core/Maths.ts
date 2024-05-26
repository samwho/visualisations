import { ObservablePoint, Point } from "pixi.js-legacy";
import { FixedSizeSortedList } from "./Collections";

export class Stats {
  private list: FixedSizeSortedList<number>;

  constructor({ windowSize }: { windowSize?: number } = {}) {
    this.list = new FixedSizeSortedList<number>(windowSize ?? 20);
  }

  public add(value: number): void {
    this.list.add(value);
  }

  public percentile(p: number): number {
    if (p < 0 || p > 100) {
      throw new Error("Percentile must be between 0 and 100.");
    }

    const size = this.list.size();
    if (size === 0) {
      return 0;
    }

    const index = (p / 100) * (size - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return this.list.get(lower)!;
    } else {
      const lowerValue = this.list.get(lower)!;
      const upperValue = this.list.get(upper)!;
      return lowerValue + (upperValue - lowerValue) * (index - lower);
    }
  }

  public withTemporary<R>(extra: number[], fn: (s: Stats) => R): R {
    return this.list.withTemporary(extra, (s) => fn(this));
  }
}

export function randBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export class Vec2 {
  static between(
    a: Point | ObservablePoint | Vec2,
    b: Point | ObservablePoint | Vec2
  ): Vec2 {
    return new Vec2(b.x - a.x, b.y - a.y);
  }

  constructor(public x: number, public y: number) {}

  public add(other: Vec2): Vec2 {
    this.x += other.x;
    this.y += other.y;
    return this;
  }

  public sub(other: Vec2): Vec2 {
    this.x -= other.x;
    this.y -= other.y;
    return this;
  }

  public dot(other: Vec2): Vec2 {
    this.x *= other.x;
    this.y *= other.y;
    return this;
  }

  public scale(scalar: number): Vec2 {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  public length(): number {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }

  public normalize(): Vec2 {
    const length = this.length();
    if (length === 0) {
      throw new Error("Cannot normalize a zero-length vector.");
    }
    this.x /= length;
    this.y /= length;
    return this;
  }

  public rotate(angle: Angle): Vec2 {
    const x = this.x;
    const y = this.y;
    this.x = x * Math.cos(angle.radians) - y * Math.sin(angle.radians);
    this.y = x * Math.sin(angle.radians) + y * Math.cos(angle.radians);
    return this;
  }

  public clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }
}

export class Angle {
  static radians(r: number): Angle {
    return new Angle(r);
  }

  static degrees(d: number): Angle {
    return new Angle((d * Math.PI) / 180);
  }

  constructor(public radians: number) {}

  public get degrees(): number {
    return (this.radians * 180) / Math.PI;
  }

  public rotate(angle: Angle): Angle {
    this.radians += angle.radians;
    return this;
  }
}
