import { Item } from "../graphics/Item";
import { Queue } from "../graphics/Queue";
import { Server } from "../graphics/Server";

export class EventManager {
  private _handlers: { [key: string]: Function[] } = {};
  private _persistentEvents: { [key: string]: any[] } = {};

  on(event: "request-created", handler: (request: Item) => void): void;
  on(
    event: "request-dropped",
    handler: (request: Item, by: Queue | Server) => void
  ): void;
  on(
    event: "request-queued",
    handler: (request: Item, by: Queue) => void
  ): void;
  on(
    event: "request-served",
    handler: (request: Item, by: Server) => void
  ): void;
  on(event: "request-timeout", handler: (request: Item) => void): void;
  on(event: string, handler: Function) {
    if (!(event in this._handlers)) this._handlers[event] = [];
    this._handlers[event].push(handler);
  }

  emit(event: "request-created", request: Item): void;
  emit(event: "request-dropped", request: Item, by: Queue | Server): void;
  emit(event: "request-queued", request: Item, by: Queue): void;
  emit(event: "request-served", request: Item, by: Server): void;
  emit(event: "request-timeout", request: Item): void;
  emit(event: string, ...args: any[]) {
    const handlers = this._handlers[event] || [];
    for (const handler of handlers) {
      handler(...args);
    }
  }

  persistentOn(
    event: "server-created",
    handler: (server: Server) => void
  ): void;
  persistentOn(event: "queue-created", handler: (queue: Queue) => void): void;
  persistentOn(event: string, handler: Function) {
    if (!(event in this._handlers)) this._handlers[event] = [];
    this._handlers[event].push(handler);

    if (event in this._persistentEvents) {
      for (const args of this._persistentEvents[event]) {
        handler(...args);
      }
    }
  }

  persistentEmit(event: "server-created", server: Server): void;
  persistentEmit(event: "queue-created", queue: Queue): void;
  persistentEmit(event: string, ...args: any[]) {
    if (!(event in this._persistentEvents)) this._persistentEvents[event] = [];
    this._persistentEvents[event].push(args);

    const handlers = this._handlers[event] || [];
    for (const handler of handlers) {
      handler(...args);
    }
  }
}
