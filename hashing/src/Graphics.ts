import * as PIXI from 'pixi.js-legacy';

export default class Graphics extends PIXI.Graphics {
    constructor(...opts: ConstructorParameters<typeof PIXI.Graphics>) {
        super(...opts);
    }
}
