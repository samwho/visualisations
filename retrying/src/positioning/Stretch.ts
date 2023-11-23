import { Rectangle, Container } from "pixi.js-legacy";
import Positioner from "./Positioner";

export default class Stretch extends Container implements Positioner {
    child: Container;
    padding: number | string;
    constructor(child: Container, padding?: number | string) {
        super();
        this.child = child;
        this.padding = padding ?? 0;
        this.addChild(child);
    }

    arrange(space: Rectangle): void {
        let padding = 0;
        if (typeof this.padding === "number") {
            padding = this.padding;
        } else if (typeof this.padding === "string") {
            if (this.padding.endsWith("%")) {
                let smallest = Math.min(space.width, space.height) / 2;
                padding = smallest * parseFloat(this.padding) / 100;
            } else {
                throw new Error(`Invalid padding: ${this.padding}`);
            }
        }

        this.child.width = space.width - padding * 2;
        this.child.height = space.height - padding * 2;
    }
}
