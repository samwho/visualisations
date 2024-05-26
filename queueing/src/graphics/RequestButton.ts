import { Resource, Texture } from "pixi.js-legacy";
import { Application } from "../core/Application";
import { getColor } from "../core/Colors";
import { Button } from "./Button";
import { Item, Priority } from "./Item";
import { Queue } from "./Queue";
import { Server } from "./Server";
import { Textures } from "../core/Textures";
import { Duration } from "../core/Duration";

type Target = Queue | Server;

export class RequestButton extends Button {
  constructor(
    opts: {
      target: Target | Target[];
      priority?: Priority;
      showPointer?: boolean;
      timeout?: Duration;
    },
    application: Application
  ) {
    let color = getColor(0);
    let texture: Texture<Resource> | undefined = undefined;
    if (opts.priority === 0) {
      color = getColor(3);
      texture = Textures.verticalStripes(application, 1);
    }

    super({ color, texture, showPointer: opts.showPointer }, application);

    const targets = Array.isArray(opts.target) ? opts.target : [opts.target];

    this.onClick(() => {
      for (const target of targets) {
        const item = new Item(
          { priority: opts.priority, timeout: opts.timeout },
          application
        );
        target.addChild(item);
        item.width = Item.RADIUS * 2;
        item.height = Item.RADIUS * 2;
        item.elope(application.stage);
        item.moveToObject(this);

        if (target instanceof Queue) {
          target.add(item);
        } else {
          target.process(item, true);
        }
      }
    });
  }
}
