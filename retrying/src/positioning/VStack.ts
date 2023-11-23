import { DisplayObject, Rectangle } from "pixi.js-legacy";
import Partitioner from "./Partitioner";

export default class VStack extends Partitioner {
    spacing: number;

    constructor(children: DisplayObject[] = [], { spacing }: { spacing: number } = { spacing: 0 }) {
        super(children);
        this.spacing = spacing;
    }

    *partition(objects: DisplayObject[], space: Rectangle): Generator<Rectangle> {
        let y = space.y;
        let height = space.height - this.spacing * (objects.length - 1);
        for (let child of objects) {
            let partition = new Rectangle(space.x, y, space.width, height / objects.length);
            y += height / this._group.length + this.spacing;
            yield partition;
        }
    }
}
