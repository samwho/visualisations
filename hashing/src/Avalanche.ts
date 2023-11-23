import { Container, Text, TextStyle } from "pixi.js-legacy";
import Application from "./Application";
import { HashFunction } from "./Hashers";
import { blue, green, grey, purple, red } from "./Colors";
import { gsap } from "gsap";

export default class Avalanche extends Application {
    hashFn: HashFunction;

    value: BitSet;
    previousValue: BitSet;

    hash: number;
    previousHash: number;

    _numBits: number;
    _mask: number;

    _topText: Text[];
    _bottomText: Text[];

    constructor({
        root,
        element,
        hashFn,
    }: {
        root: HTMLElement
        element: HTMLElement
        hashFn: HashFunction,
    }) {
        super({ root, element });

        this._numBits = 8;
        this._mask = (1 << this._numBits) - 1;
        this.hashFn = (s) => hashFn(s) & this._mask;

        this.value = new BitSet(this._numBits);
        this.previousValue = this.value.clone();

        this.hash = this.hashFn(this.value.toString());
        this.previousHash = this.hashFn(this.previousValue.toString());

        let fontSize = Math.min(
            Math.floor((this.screen.height * 0.9) / 2),
            Math.floor(this.screen.width / this._numBits)
        );

        let textStyle: Partial<TextStyle> = {
            fontFamily: "Fira Code",
            fontSize,
            fill: 0xffffff,
            trim: false,
        };

        this._topText = [];
        this._bottomText = [];

        let x = 0;
        let top = new Container();

        for (let char of this.value.toBinaryString()) {
            let text = new Text(char, textStyle);
            text.x = x;
            text.tint = grey;
            x += text.width;
            top.addChild(text);
            this._topText.push(text);
        }

        x = 0;
        let bottom = new Container();
        bottom.y = fontSize;

        for (let char of this.hash.toString(2).padStart(this._numBits, "0")) {
            let text = new Text(char, textStyle);
            text.x = x;
            text.tint = grey;
            x += text.width;
            bottom.addChild(text);
            this._bottomText.push(text);
        }

        top.x = (this.screen.width - top.width) / 2;
        bottom.x = (this.screen.width - bottom.width) / 2;

        top.y = Math.max(0, (this.screen.height - top.height - bottom.height) / 2);
        bottom.y = top.y + top.height;

        this.stage.addChild(top);
        this.stage.addChild(bottom);

        this.ticker.update();
    }

    flip() {
        this.previousValue = this.value.clone();
        this.value.flipRandomBit();

        this.hash = this.hashFn(this.value.toString());
        this.previousHash = this.hashFn(this.previousValue.toString());

        this.updateText();
    }

    updateText() {
        let curr = this.value.toBinaryString();
        let prev = this.previousValue.toBinaryString();
        for (let i = 0; i < this._numBits; i++) {
            let text = this._topText[i];
            text.text = curr[i];
            if (curr[i] !== prev[i]) {
                text.tint = purple;
            } else {
                text.tint = grey;
            }
        }

        let tl = this.timeline();
        curr = this.hash.toString(2).padStart(this._numBits, "0");
        prev = this.previousHash.toString(2).padStart(this._numBits, "0");
        for (let i = 0; i < this._numBits; i++) {
            let text = this._bottomText[i];

            let tint = red;
            if (curr[i] !== prev[i]) {
                tint = green;
            }

            tl.to(text, {
                pixi: { tint },
                overwrite: true,
                duration: 0.03,
                onStart: () => {
                    text.text = curr[i];
                },
                onInterrupt: () => {
                    text.text = curr[i];
                }
            });
        }

        tl.play();
    }
}

class BitSet {
    _bytes: Uint8Array;

    constructor(numBits: number) {
        this._bytes = new Uint8Array(Math.ceil(numBits / 8));
    }

    get(index: number): boolean {
        let byteIndex = Math.floor(index / 8);
        let bitIndex = index % 8;
        let byte = this._bytes[byteIndex];
        return (byte & (1 << bitIndex)) !== 0;
    }

    set(index: number, value: boolean) {
        let byteIndex = Math.floor(index / 8);
        let bitIndex = index % 8;
        let byte = this._bytes[byteIndex];
        if (value) {
            byte |= (1 << bitIndex);
        } else {
            byte &= ~(1 << bitIndex);
        }
        this._bytes[byteIndex] = byte;
    }

    flipRandomBit() {
        let randomIndex = Math.floor(Math.random() * this._bytes.length);
        let randomBit = Math.floor(Math.random() * 8);
        this._bytes[randomIndex] ^= (1 << randomBit);
    }

    toString(): string {
        let str = "";
        for (let i = 0; i < this._bytes.length; i++) {
            str += String.fromCharCode(this._bytes[i]);
        }
        return str;
    }

    toBinaryString(): string {
        let str = "";
        for (let i = 0; i < this._bytes.length; i++) {
            str += this._bytes[i].toString(2).padStart(8, "0");
        }
        return str.slice(0, this._bytes.length * 8);
    }

    clone(): BitSet {
        let clone = new BitSet(this._bytes.length * 8);
        clone._bytes = this._bytes.slice();
        return clone;
    }
}
