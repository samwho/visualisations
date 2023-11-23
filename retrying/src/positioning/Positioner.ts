import { Rectangle } from "pixi.js-legacy";

export default interface Positioner {
    arrange(screen: Rectangle): void;
}
