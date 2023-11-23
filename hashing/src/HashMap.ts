import Application from "./Application";
import Graphics from "./Graphics";
import { HashFunction, ValueFunction, getHashFunctionName, getValuesFunction } from "./Hashers";
import { blue, green, orange } from "./Colors";
import { Point, Text } from "pixi.js-legacy";

export default class HashMap extends Application {
    hashFn: HashFunction;
    valueFn: ValueFunction;
    _counter: number = 0;
    buckets: Bucket[];
    itemsPerBucket: number;
    keyInput: HTMLElement;
    hashInput: HTMLElement;
    bucketInput: HTMLElement;
    seed: number;

    constructor({
        root,
        element,
        hashFn,
        keyInput,
        hashInput,
        bucketInput,
        seed,
    }: {
        root: HTMLElement,
        element: HTMLElement,
        hashFn: HashFunction
        keyInput: HTMLElement,
        hashInput: HTMLElement,
        bucketInput: HTMLElement,
        seed: number,
    }) {
        super({ root, element });

        this.hashFn = hashFn;
        this.valueFn = getValuesFunction(this.getAttribute("valueFn") || "random");
        this.buckets = [];
        this.keyInput = keyInput;
        this.hashInput = hashInput;
        this.bucketInput = bucketInput;
        this.seed = seed;

        let bucketWidth = this.getAttribute("bucketWidth", parseInt) || 50;
        this.itemsPerBucket = this.getAttribute("itemsPerBucket", parseInt) || 4;
        let lineWidth = this.getAttribute("lineWidth", parseInt) || 2;

        let numBuckets = Math.floor(this.screen.width / bucketWidth);
        let padding = bucketWidth / 8;
        let itemWidth = bucketWidth - (padding * 2) - (lineWidth * 2);
        let bucketHeight = itemWidth * this.itemsPerBucket + (padding * 2) + (lineWidth * 2);

        let leftOverX = this.screen.width - (bucketWidth * numBuckets);
        let leftOverY = this.screen.height - bucketHeight;

        let x = 0;
        for (let i = 0; i < numBuckets; i++) {
            let bucket = new Bucket({
                width: bucketWidth,
                height: bucketHeight,
                padding,
                lineWidth,
            });
            bucket.x = x;
            x += bucketWidth + (leftOverX / (numBuckets - 1));
            bucket.y = leftOverY;

            let label = new Text(i.toString(), {
                fontSize: 12,
                fill: blue,
            });

            label.x = bucket.x + (bucketWidth / 2) - (label.width / 2);
            label.y = bucket.y - label.height;

            this.buckets.push(bucket);
            this.stage.addChild(bucket);
            this.stage.addChild(label);
        }

        this.ticker.update();
    }

    async run() {
        for (let bucket of this.buckets) {
            bucket.reset();
        }

        for (let i = 0; i < 100; i++) {
            let key = crypto.randomUUID();
            if (!this.canAdd(key)) {
                break;
            }
            await this.add(key, key);
        }

        this.ticker.update();
    }

    canAdd(key: string): boolean {
        let hash = this.hashFn(key, this.seed);
        let bucket = this.buckets[hash % this.buckets.length];
        return bucket.items.length < this.itemsPerBucket;
    }

    addRandom(): Promise<void> {
        this._counter++;
        let value = this.valueFn(this._counter);
        return this.add(value, "value");
    }

    add(key: string, value: string): Promise<void> {
        return new Promise((resolve) => {
            let tl = this.timeline();

            let hash = this.hashFn(key, this.seed);
            let hashFnName = getHashFunctionName(this.hashFn);
            let bucket = this.buckets[hash % this.buckets.length];

            this.keyInput.innerText = `set("${key}", "${value}")`;
            if (this.seed !== 0) {
                this.hashInput.innerText = `${hashFnName}("${key}", ${this.seed}) == ${hash.toString()}`;
            } else {
                this.hashInput.innerText = `${hashFnName}("${key}") == ${hash.toString()}`;
            }
            this.bucketInput.innerText = `${hash} % ${this.buckets.length} == ${(hash % this.buckets.length).toString()}`;

            if (bucket.items.length >= this.itemsPerBucket) {
                for (let b of this.buckets) {
                    b.reset();
                }
            }

            let item = new Item({ key, value, bucket });
            let to = bucket.addItem(item);
            let from = bucket.toLocal(new Point(this.screen.width / 2, 10));

            item.x = from.x;
            item.y = from.y;

            tl.to(this.buckets, {
                pixi: {
                    tint: orange,
                },
                duration: 0,
            });

            for (let b of this.buckets) {
                if (b.items.length === 0) {
                    continue;
                }
                tl.to(b.items, {
                    pixi: {
                        tint: orange,
                    },
                    duration: 0,
                });
            }

            tl.to([bucket, ...bucket.items], {
                pixi: {
                    tint: green,
                },
                duration: 0,
            });

            tl.to(item, {
                pixi: {
                    x: to.x,
                    y: to.y,
                },
                duration: 0.5,
                ease: "power2.out",
                onComplete: () => {
                    resolve();
                },
            });

            tl.play();
        });
    }
}

class Bucket extends Graphics {
    items: Item[];
    padding: number;
    innerWidth: number;
    innerHeight: number;
    lineWidth: number;

    constructor({
        width,
        height,
        padding,
        lineWidth,
    }: {
        width: number,
        height: number,
        padding: number,
        lineWidth: number
    }) {
        super();

        this.items = [];

        this.lineWidth = lineWidth;
        this.padding = padding;
        this.innerWidth = width - (padding * 2);
        this.innerHeight = height - (padding * 2);
        this.lineStyle(this.lineWidth, 0xFFFFFF);
        this.tint = orange;
        this.drawRoundedRect(padding, padding, this.innerWidth, this.innerHeight, this.innerWidth / 4);
        this.endFill();
    }

    nextPosition(): Point {
        let x = this.padding + this.lineWidth * 2;
        let y = this.padding + this.innerHeight - (
            (this.innerWidth - this.lineWidth * 2) * (this.items.length + 1)
        );
        return new Point(x, y);
    }

    addItem(item: Item): Point {
        let pos = this.nextPosition();
        this.items.push(item);
        this.addChild(item);
        return pos;
    }

    reset() {
        this.items.forEach((item) => {
            this.removeChild(item);
        });
        this.items = [];
    }
}

class Item extends Graphics {
    key: string
    value: string
    bucket: Bucket

    constructor({ key, value, bucket }: { key: string, value: string, bucket: Bucket }) {
        super();

        this.key = key;
        this.value = value;
        this.bucket = bucket;

        let width = this.bucket.innerWidth - (this.bucket.lineWidth * 4);
        let height = this.bucket.innerWidth - (this.bucket.lineWidth * 4);

        this.tint = orange;
        this.beginFill(0xFFFFFF);
        this.drawRoundedRect(0, 0, width, height, width / 4);
        this.endFill();
    }
}
