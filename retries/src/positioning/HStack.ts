import { DisplayObject, Rectangle } from "pixi.js-legacy";
import Partitioner from "./Partitioner";

export default class HStack extends Partitioner {
    spacing: number;

    constructor(children: DisplayObject[] = [], { spacing }: { spacing: number } = { spacing: 0 }) {
        super(children);
        this.spacing = spacing;
    }

    *partition(objects: DisplayObject[], space: Rectangle): Generator<Rectangle> {
        let x = space.x;
        let width = space.width - this.spacing * (objects.length - 1);
        for (let child of objects) {
            let partition = new Rectangle(x, space.y, width / objects.length, space.height);
            x += width / this._group.length + this.spacing;
            yield partition;
        }
    }
}
