import { DisplayObject, Rectangle } from "pixi.js-legacy";
import Partitioner from "./Partitioner";

export default class HSplit extends Partitioner {
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
        let x = space.x;
        let totalWidth = space.width - this.spacing * (objects.length - 1);
        for (let [index, _] of objects.entries()) {
            let width = (totalWidth / this.total) * this.splits[index];
            let partition = new Rectangle(x, space.y, width, space.height);
            x += width + this.spacing;
            yield partition;
        }
    }
}
