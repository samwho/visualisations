import { Item } from "../graphics/Item";
import { Application } from "./Application";

export class GlobalEvents {
  private static _handednessChangeHandlers: ((
    handedness: "left" | "right"
  ) => void)[] = [];
  private static _applicationCreatedHandlers: {
    [key: string]: ((app: Application) => void)[];
  } = {};
  private static _applicationCreatedQueued: { [key: string]: Application } = {};
  private static _requestGraveyardHandlers: ((request: Item) => void)[] = [];

  public static onApplicationCreated(
    id: string,
    handler: (app: Application) => void
  ) {
    if (id in this._applicationCreatedQueued) {
      handler(this._applicationCreatedQueued[id]);
      return;
    }
    if (!(id in this._applicationCreatedHandlers)) {
      this._applicationCreatedHandlers[id] = [];
    }
    this._applicationCreatedHandlers[id].push(handler);
  }

  public static emitApplicationCreated(id: string, app: Application) {
    this._applicationCreatedQueued[id] = app;
    for (const handler of this._applicationCreatedHandlers[id]) {
      handler(app);
    }
    this._applicationCreatedHandlers[id] = [];
  }

  public static onHandednessChange(
    handler: (handedness: "left" | "right") => void
  ) {
    this._handednessChangeHandlers.push(handler);
  }

  public static emitHandednessChange(handedness: "left" | "right") {
    for (const handler of this._handednessChangeHandlers) {
      handler(handedness);
    }
  }

  public static onRequestGraveyard(handler: (request: Item) => void) {
    this._requestGraveyardHandlers.push(handler);
  }

  public static emitRequestGraveyard(request: Item) {
    for (const handler of this._requestGraveyardHandlers) {
      handler(request);
    }
  }
}
