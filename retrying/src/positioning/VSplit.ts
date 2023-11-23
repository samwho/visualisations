import { DisplayObject, Rectangle } from "pixi.js-legacy";
import Partitioner from "./Partitioner";

export default class VSplit extends Partitioner {
    splits: number[];
    total: number;
    spacing: number;

    constructor(splits: [number, DisplayObject][] = [], { spacing }: { spacing?: number } = {}) {
        super(splits.map(([_, child]) => child));
        this.splits = splits.map(([split, _]) => split);
        this.spacing = spacing ?? 0;
        this.total = this.splits.reduce((a, b) => a + b, 0);
    }

    *partition(objects: DisplayObject[], space: Rectangle): Generator<Rectangle> {
        let y = space.y;
        let totalHeight = space.height - this.spacing * (objects.length - 1);
        for (let [index, _] of objects.entries()) {
            let height = (totalHeight / this.total) * this.splits[index];
            let partition = new Rectangle(space.x, y, space.width, height);
            y += height + this.spacing;
            yield partition;
        }
    }
}
