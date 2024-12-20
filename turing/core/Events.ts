import type { BaseElement } from "./BaseElement";

export interface BaseEvent {
  source: InstanceType<typeof BaseElement>;
}

export interface StepEvent extends BaseEvent {}
export interface StartEvent extends BaseEvent {}
export interface StopEvent extends BaseEvent {}
export interface PauseEvent extends BaseEvent {}
export interface HaltEvent extends BaseEvent {}
export interface RestartEvent extends BaseEvent {}
export interface RestoreStateEvent extends BaseEvent {}
export interface ErrorEvent extends BaseEvent {
  error: Error;
}

interface Registry {
  [key: string]: BaseEvent;
}

export interface GlobalRegistry extends Registry {
  step: StepEvent;
  start: StartEvent;
  stop: StopEvent;
  pause: PauseEvent;
  halt: HaltEvent;
  restart: RestartEvent;
  restoreState: RestoreStateEvent;
  error: ErrorEvent;
}

export interface EventHandler<E extends BaseEvent = BaseEvent> {
  (event: E): void | Promise<void>;
  target?: InstanceType<typeof BaseElement>;
}

export class Events<R extends Registry> {
  private static instance = new Events<GlobalRegistry>();
  public static on = Events.instance.on.bind(Events.instance);
  public static off = Events.instance.off.bind(Events.instance);
  public static dispatch = Events.instance.dispatch.bind(Events.instance);
  public static once = Events.instance.once.bind(Events.instance);

  protected constructor() {}

  private listeners = new Map<keyof R, Set<EventHandler>>();

  public on<T extends keyof R>(
    type: T,
    listener: EventHandler<R[T]>,
    opts?: { from?: InstanceType<typeof BaseElement> },
  ) {
    if (opts?.from) {
      listener.target = opts.from;
    }

    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener as EventHandler<BaseEvent>);
  }

  public off<T extends keyof R>(type: T, listener: EventHandler<R[T]>) {
    if (!this.listeners.has(type)) {
      return;
    }
    this.listeners.get(type)!.delete(listener as EventHandler<BaseEvent>);
  }

  public async dispatch<T extends keyof R>(type: T, event: R[T]) {
    for (const listener of this.listeners.get(type) || []) {
      if (listener.target && listener.target !== event.source) {
        continue;
      }

      const value = listener(event as BaseEvent);
      if (value instanceof Promise) {
        await value;
      }
    }
  }

  public once<T extends keyof R>(
    type: T,
    listener: EventHandler<R[T]>,
    opts?: { from?: InstanceType<typeof BaseElement> },
  ) {
    const wrapped = (event: R[T]) => {
      listener(event);
      this.off(type, wrapped);
    };
    if (opts?.from) {
      wrapped.target = opts.from;
    }
    this.on(type, wrapped);
  }
}
