import { Container, DisplayObject, Rectangle } from "pixi.js-legacy";
import Partitioner from "./Partitioner";

export default class Grid extends Partitioner {
  constructor(children: Container[] = []) {
    super(children);
  }

  *partition(objects: DisplayObject[], space: Rectangle): Generator<Rectangle> {
    let containers = objects as Container[];

    let aspectRatio = space.width / space.height;
    let rows = Math.ceil(Math.sqrt(containers.length / aspectRatio));
    let columns = Math.ceil(containers.length / rows);
    let width = space.width / columns;
    let height = space.height / rows;

    let row = 0;
    let column = 0;
    for (let _ of containers) {
      let shift = 0;
      if (row == rows - 1) {
        let items_on_last_row = containers.length - (rows - 1) * columns;
        shift = (space.width - items_on_last_row * width) / 2;
      }

      let partition = new Rectangle(
        space.x + column * width + shift,
        space.y + row * height,
        width,
        height
      );

      yield partition;

      column++;
      if (column >= columns) {
        column = 0;
        row++;
      }
    }
  }
}
