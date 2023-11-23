import {
  Container,
  DisplayObject,
  Graphics,
  Point,
  Rectangle,
} from "pixi.js-legacy";
import Positioner from "./Positioner";

export default abstract class Partitioner
  extends Container
  implements Positioner
{
  debug: boolean = false;
  center: boolean = true;
  _group: DisplayObject[];
  space: Rectangle | null = null;

  constructor(
    children: DisplayObject[] = [],
    { debug, center }: { debug?: boolean; center?: boolean } = {}
  ) {
    super();
    this.debug = debug ?? this.debug;
    this.center = center ?? this.center;
    this._group = children;
    this.sortableChildren = true;
    this.zIndex = children
      .map((child) => child.zIndex)
      .reduce((a, b) => Math.min(a, b), Infinity);
  }

  abstract partition(
    objects: DisplayObject[],
    space: Rectangle
  ): IterableIterator<Rectangle>;

  addChild<U extends DisplayObject[]>(...children: U): U[0] {
    let firstChild = children[0];
    for (let child of children) {
      this._group.push(child);
    }
    this.refresh();
    return firstChild;
  }

  addChildAt<U extends DisplayObject>(child: U, index: number): U {
    this._group.splice(index, 0, child);
    this.refresh();
    return child;
  }

  removeChild<U extends DisplayObject[]>(...children: U): U[0] {
    let firstChild = children[0];
    for (let child of children) {
      let index = this._group.indexOf(child);
      if (index === -1) {
        throw new Error("Child not found");
      }
      this._group.splice(index, 1);
    }
    this.refresh();
    return firstChild;
  }

  removeChildAt(index: number): DisplayObject {
    let child = this._group[index];
    this._group.splice(index, 1);
    this.refresh();
    return child;
  }

  removeChildren(
    beginIndex?: number | undefined,
    endIndex?: number | undefined
  ): DisplayObject[] {
    let children = this._group.splice(
      beginIndex ?? 0,
      endIndex ?? this._group.length
    );
    this.refresh();
    return children;
  }

  refresh(): void {
    if (this.space) {
      this.arrange(this.space);
    }
  }

  arrange(space: Rectangle) {
    this.space = space;
    super.removeChildren();

    let i = 0;
    for (let partition of this.partition(this._group, space)) {
      let child = this._group[i];
      i += 1;

      let point = this.toLocal(new Point(partition.x, partition.y));

      let container = new Container();
      container.x = point.x;
      container.y = point.y;
      container.width = partition.width;
      container.height = partition.height;
      container.zIndex = child.zIndex;

      if (this.debug) {
        let dbg = new Graphics();
        dbg.name = "dbg";
        dbg.zIndex = -Infinity;
        dbg.beginFill(0x000000, 0.05);
        dbg.drawRect(1, 1, partition.width - 2, partition.height - 2);
        dbg.endFill();
        container.addChild(dbg);
      }

      if (this.center) {
        child.x = partition.width / 2;
        child.y = partition.height / 2;
      }

      container.addChild(child);
      super.addChild(container);

      if ("debug" in child) {
        child.debug = this.debug;
      }

      if ("arrange" in child && typeof child.arrange === "function") {
        child.arrange(partition);
      }
    }
  }
}
