import Application from "./Application";

export default class CustomElement extends HTMLElement {
  static elementName: string;
  static observedAttributes: string[] = [];

  application: Application;
  _container: HTMLElement;

  static register() {
    customElements.define(this.elementName, this);
  }

  async initApplication(
    root: HTMLElement,
    container: HTMLElement
  ): Promise<Application> {
    throw new Error("Not implemented");
  }

  async preApplicationInit() {}
  async postApplicationInit() {}

  async connectedCallback() {
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    flex-wrap: nowrap;
                    align-items: stretch;
                    align-content: stretch;
                    width: 100%;
                    line-height: 0;
                    user-select: none;
                }
            </style>
        `;

    await this.preApplicationInit();

    this._container = document.createElement("div");
    this.shadowRoot!.appendChild(this._container);

    this._container.style.width = "100%";
    this._container.style.flexGrow = "1";
    this._container.style.flexShrink = "1";

    this.application = await this.initApplication(this, this._container);
    if (this.getAttribute("pixidebug") !== null) {
      globalThis.__PIXI_APP__ = this.application;
    }
    await this.postApplicationInit();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (!this.application) {
      return;
    }
    this.application.onAttributeChange(name, newValue);
  }

  disconnectedCallback() {
    this.application.destroy();
  }
}
