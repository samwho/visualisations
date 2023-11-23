import Application from "./Application";
import { blue, green, purple } from "./Colors";
import CustomElement from "./CustomElement";
import HashMap from "./HashMap";
import { HasherStr, getHashFunction } from "./Hashers";

export default class HashMapElement extends CustomElement {
    static elementName = "hash-map";
    static observedAttributes = ["hashFn", "bucketWidth", "itemsPerBucket", "lineWidth", "padding"];

    keyInput: HTMLInputElement;
    hashInput: HTMLInputElement;
    bucketInput: HTMLInputElement;

    _createInput(name: string, color: number): HTMLElement {
        let container = document.createElement("div");
        container.style.display = "flex";
        container.style.alignItems = "stretch";
        container.style.flexGrow = "1";
        container.style.flexShrink = "1";
        container.style.minWidth = "50px";
        container.style.lineHeight = "1rem";
        container.style.fontSize = "0.8rem";
        container.style.overflow = "hidden";

        let label = document.createElement("div");
        label.textContent = name;
        label.style.borderTopLeftRadius = "0.4rem";
        label.style.borderBottomLeftRadius = "0.4rem";
        label.style.minWidth = "3.5rem";
        label.style.padding = "0.3rem";
        label.style.display = "flex";
        label.style.fontFamily = "Fira Code";
        label.style.fontWeight = "bold";
        label.style.color = "white";
        label.style.alignItems = "center";
        label.style.justifyContent = "center";
        label.style.backgroundColor = `#${color.toString(16).padStart(6, "0")}`;
        container.appendChild(label);

        let input = document.createElement("div");
        input.classList.add("hash-map-input");
        input.style.display = "flex";
        input.style.alignItems = "center";
        input.style.borderBottomRightRadius = "0.4rem";
        input.style.borderTopRightRadius = "0.4rem";
        input.style.borderTop = "1px solid #cccccc";
        input.style.borderRight = input.style.borderTop;
        input.style.borderBottom = input.style.borderTop;
        input.style.paddingLeft = "0.2rem";
        input.style.fontFamily = "Fira Code";
        input.style.fontWeight = "bold";
        input.style.color = `#${color.toString(16).padStart(6, "0")}`;
        input.style.flexGrow = "1";
        input.style.flexShrink = "1";
        input.style.minWidth = "250px";
        input.style.flexWrap = "nowrap";
        input.style.textWrap = "nowrap";
        container.appendChild(input);
        return container;
    }

    async preApplicationInit() {
        let container = document.createElement("div");
        container.style.display = "flex";
        container.style.flexDirection = "row";
        container.style.justifyContent = "space-around";
        container.style.flexWrap = "wrap";
        container.style.gap = "0.5rem";
        container.style.width = "100%";

        let value = this._createInput("Key", blue);
        value.style.width = "100%";
        this.keyInput = value.querySelector(".hash-map-input")!;
        container.appendChild(value);

        let hash = this._createInput("Hash", purple);
        this.hashInput = hash.querySelector(".hash-map-input")!;
        container.appendChild(hash);

        let bucket = this._createInput("Bucket", green);
        this.bucketInput = bucket.querySelector(".hash-map-input")!;
        container.appendChild(bucket);

        this.shadowRoot!.appendChild(container);
    }

    async initApplication(root: HTMLElement, container: HTMLElement): Promise<Application> {
        let bucketWidth = parseInt(root.getAttribute("bucketWidth") || "50");
        let padding = bucketWidth / 8;
        let itemsPerBucket = parseInt(root.getAttribute("itemsPerBucket") || "4");
        let height = Math.ceil((bucketWidth - padding) * itemsPerBucket);

        container.style.minHeight = `${height}px`;
        container.style.cursor = "pointer";

        let hashFn = this.getAttribute("hashFn") || "murmur3";
        let seed = parseInt(this.getAttribute("seed") || "0");

        container.addEventListener("click", async (event) => {
            event.preventDefault();
            let hashMap = this.application as HashMap;
            await hashMap.addRandom();
        });

        return new HashMap({
            root,
            element: container,
            hashFn: getHashFunction(hashFn as HasherStr),
            keyInput: this.keyInput,
            hashInput: this.hashInput,
            bucketInput: this.bucketInput,
            seed,
        });
    }
}
