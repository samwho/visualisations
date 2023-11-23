import Application from "./Application";
import CustomElement from "./CustomElement";
import HeatMap from "./HeatMap";

export default class HeatMapElement extends CustomElement {
    static elementName = "heat-map";
    static observedAttributes = ["iterations", "animationlength", "hashfn", "hashfnurl", "hashfnbase64", "valuefn", "seed", "color", "blocksize"];

    async initApplication(root: HTMLElement, container: HTMLElement): Promise<Application> {
        container.style.cursor = "pointer";

        this.addEventListener("click", (event) => {
            event.preventDefault();

            let heatMap = this.application as HeatMap;
            if (heatMap._animated) {
                heatMap.redraw();
                return false;
            }

            this.application.destroy();
            container.innerHTML = "";

            this.application = new HeatMap({
                root,
                element: container,
                animated: true,
            });
        });

        return new HeatMap({ root, element: container });
    }
}
