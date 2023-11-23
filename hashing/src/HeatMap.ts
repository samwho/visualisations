import Application from './Application';
import { HashFunction, HasherStr, ValueFunction, ValuesStr, getHashFunction, getValuesFunction } from './Hashers';
import { getColor } from './Colors';
import Graphics from './Graphics';
import { Container } from 'pixi.js-legacy';

export default class HeatMap extends Application {
    blocks: Uint8Array;

    _iterations: number;
    _currentIteration: number;
    _blockSize: number;
    _hashFn: HashFunction;
    _valueFn: ValueFunction;
    _seed: number;
    _animated: boolean;
    _animationSeconds: number = 8;
    _color: number;
    _graphics: Graphics[];

    constructor({
        root,
        element,
        animated,
    }: {
        root: HTMLElement,
        element: HTMLElement,
        animated?: boolean,
    }) {
        super({ root, element });
        this.stage.interactiveChildren = false;
        this._animated = animated || false;
        this._init();
    }

    async _init() {
        if (!this._animated) {
            this._animated = this.getAttribute("animated") === "true";
        }
        this._iterations = this.getAttribute("iterations", parseInt) || 10000;
        this._hashFn = getHashFunction(this.getAttribute("hashFn") || "murmur3");
        this._valueFn = getValuesFunction(this.getAttribute("valueFn") || "intToStr");
        this._seed = this.getAttribute("seed", parseInt) || 0;
        this._color = getColor(this.getAttribute("color") || "blue");
        this._blockSize = this.getAttribute("blockSize", parseInt) || this.screen.width / 30;

        this._graphics = [];

        let offsetX = (this.screen.width % this._blockSize) / 2;
        let offsetY = (this.screen.height % this._blockSize) / 2;

        let scaleX = (1 + (offsetX * 2) / this.screen.width);
        let scaleY = (1 + (offsetY * 2) / this.screen.height);

        let width = Math.floor(this.screen.width / this._blockSize);
        let height = Math.floor(this.screen.height / this._blockSize);

        let container = new Container();
        container.scale.x = scaleX;
        container.scale.y = scaleY;
        this.stage.addChild(container);

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                let graphics = new Graphics();
                graphics.beginFill(0xFFFFFF);
                graphics.drawRect(0, 0, this._blockSize, this._blockSize);
                graphics.endFill();
                graphics.x = x * this._blockSize;
                graphics.y = y * this._blockSize;
                graphics.tint = this._color;

                let location = y * width + x;
                let max = (this._iterations / (width * height) * 2);
                Object.defineProperty(graphics, "alpha", {
                    get: () => {
                        return Math.min(1, this.blocks[location] / max);
                    },
                });
                container.addChild(graphics);
                this._graphics.push(graphics);
            }
        }

        if (this._animated) {
            this.ticker.stop();
            this.ticker.add(() => {
                let fps = Math.max(this.ticker.minFPS, this.ticker.FPS);
                let maxIterations = Math.ceil(this._iterations / (fps * this._animationSeconds));
                for (let i = 0; i < maxIterations; i++) {
                    if (this._currentIteration >= this._iterations) {
                        this.ticker.stop();
                        return;
                    }

                    let index = this._hashFn(this._valueFn(this._currentIteration), this._seed) % this.blocks.length;
                    let value = this.blocks[index];
                    if (value < 255) {
                        this.blocks[index] = value + 1;
                    }
                    this._currentIteration++;
                }
            });
        }

        this.redraw();
    }

    redraw() {
        let width = Math.floor(this.screen.width / this._blockSize);
        let height = Math.floor(this.screen.height / this._blockSize);

        this.blocks = new Uint8Array(width * height);

        if (this._animated) {
            this._currentIteration = 0;
            this.ticker.start();
        } else {
            for (let i = 0; i < this._iterations; i++) {
                let index = this._hashFn(this._valueFn(i), this._seed) % this.blocks.length;
                let value = this.blocks[index];
                if (value < 255) {
                    this.blocks[index] = value + 1;
                }
            }
            this.ticker.update();
        }
    }

    async _getHashFnFromUrl(url: string): Promise<HashFunction | null> {
        return await this._getHashFnFromCode(await (await fetch(url)).text());
    }

    async _getHashFnFromCode(code: string): Promise<HashFunction | null> {
        try {
            let module = await import(`data:text/javascript;base64,${btoa(code)}`);
            let fn = module.default as HashFunction;
            if (typeof fn !== "function") {
                throw new Error("Failed to find a default exported function. Make sure to add `export default` to the start of your hash function definition.");
            }
            // We call the function once just to make sure it works.
            fn("fdhjsakfdsjaklfdjsklafhjdsajfkdsa;fkdsl;");
            return fn;
        } catch (e) {
            this.root.dispatchEvent(new CustomEvent("error", { detail: e }));
            return null;
        }
    }

    async onAttributeChange(name: string, value: string): Promise<void> {
        let redraw = true;

        switch (name) {
            case "iterations":
                this._iterations = parseInt(value);
                break;
            case "seed":
                this._seed = parseInt(value);
                break;
            case "animationlength":
                this._animationSeconds = parseFloat(value);
                break;
            case "hashfn":
                this._hashFn = getHashFunction(value as HasherStr);
                break;
            case "valuefn":
                this._valueFn = getValuesFunction(value as ValuesStr);
                break;
            case "color":
                this._color = getColor(value);
                for (let graphics of this._graphics) {
                    graphics.tint = this._color;
                }
                break;
            case "blocksize":
                this._blockSize = parseInt(value);
                break;
            case "hashfnurl":
                redraw = false;
                let hashFn = await this._getHashFnFromUrl(value);
                if (hashFn) {
                    this._hashFn = hashFn;
                    redraw = true;
                }
                break;
            case "hashfnbase64":
                redraw = false;
                let hashFn2 = await this._getHashFnFromCode(atob(value));
                if (hashFn2) {
                    this._hashFn = hashFn2;
                    redraw = true;
                }
                break;
            default:
                throw new Error(`Unknown attribute: ${name}`);
        }

        if (redraw) {
            this.redraw();
        }
    }
}
