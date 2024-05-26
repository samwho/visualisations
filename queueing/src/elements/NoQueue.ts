import { HStack } from "pixijs-layout";
import { Application } from "../core/Application";
import { customElement } from "../core/Decorators";
import { Server } from "../graphics/Server";
import { Container } from "pixi.js-legacy";
import { Item } from "../graphics/Item";
import { RequestButton } from "../graphics/RequestButton";

@customElement("s-no-queue", {
  height: `${Item.RADIUS * 4}px`,
  minWidth: "300px",
  marginBottom: "2rem",
  marginTop: "1rem",
})
export class NoQueue extends Application {
  server: Server;
  interval: number;
  button: RequestButton;

  constructor(...args: ConstructorParameters<typeof Application>) {
    super(...args);
    this.stage.interactiveChildren = true;

    this.server = new Server({}, this);
    this.interval = this.getAttribute("interval", parseFloat) || 1.5;

    const showPointer = this.getAttribute("show-pointer", (v) => v === "true");
    this.button = new RequestButton({ target: this.server, showPointer }, this);

    this.initLayout();
  }

  initLayout() {
    if (this.handedness === "left") {
      this.registerLayout(
        HStack(this.button, new Container(), this.server)
          .proportions(1, 3, 1)
          .leaves((leaf) =>
            leaf
              .fit()
              .paddingTop("15%")
              .paddingBottom("15%")
              .paddingLeft(10)
              .paddingRight(10)
          )
      );
    } else {
      this.registerLayout(
        HStack(this.server, new Container(), this.button)
          .proportions(1, 3, 1)
          .leaves((leaf) =>
            leaf
              .fit()
              .paddingTop("15%")
              .paddingBottom("15%")
              .paddingLeft(10)
              .paddingRight(10)
          )
      );
    }
  }

  onHandednessChange(): void {
    this.stage.removeChildren();
    this.initLayout();
  }
}
