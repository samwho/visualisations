
import Application from "./Application";
import CustomElement from "./CustomElement";
import Avalanche from "./Avalanche";
import { HasherStr, getHashFunction } from "./Hashers";

export default class AvalancheElement extends CustomElement {
    static elementName = "avalanche-effect";
    static observedAttributes = ["hashFn"];

    async initApplication(root: HTMLElement, container: HTMLElement): Promise<Application> {
        container.style.cursor = "pointer";

        this.addEventListener("click", (event) => {
            event.preventDefault();
            let avalanche = this.application as Avalanche;
            avalanche.flip();
        });

        let hashFn = this.getAttribute("hashFn") || "murmur3";
        return new Avalanche({
            root,
            element: container,
            hashFn: getHashFunction(hashFn as HasherStr),
        });
    }
}
