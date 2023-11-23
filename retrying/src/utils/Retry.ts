import GUI from "lil-gui";
import { randBetween } from "../core/Utils";
import Duration from "./Duration";
import Application from "../core/Application";

export type RetryStrategyName = "none" | "linear" | "exponential";

export interface RetryStrategy {
  name: RetryStrategyName;
  retry(): Generator<Duration, void, void>;
  debug(gui: GUI): void;
}

export function getStrategy(
  name: RetryStrategyName,
  options?: any
): RetryStrategy {
  let opts = options ?? {};
  switch (name) {
    case "none":
      return new NoStrategy();
    case "linear":
      return new LinearStrategy(opts);
    case "exponential":
      return new ExponentialStrategy(opts);
    default:
      throw new Error(`Unknown retry strategy: ${name}`);
  }
}

export function getStrategyFromApplication(
  application: Application,
  name: RetryStrategyName
): RetryStrategy {
  switch (name) {
    case "none":
      return new NoStrategy();
    case "linear":
      return LinearStrategy.fromApplication(application);
    case "exponential":
      return ExponentialStrategy.fromApplication(application);
    default:
      throw new Error(`Unknown retry strategy: ${name}`);
  }
}

export class NoStrategy implements RetryStrategy {
  name: RetryStrategyName = "none";

  *retry(): Generator<Duration, void, void> {
    yield Duration.seconds(0);
  }

  debug(gui: GUI): void {
    // no-op
  }
}

export class LinearStrategy implements RetryStrategy {
  name: RetryStrategyName = "linear";

  private delay: Duration;
  private maxAttempts: number;

  static fromApplication(application: Application) {
    return new LinearStrategy({
      delay: application.getAttribute("delay", (v: string) =>
        Duration.ms(parseFloat(v))
      ),
      maxAttempts: application.getAttribute("max-attempts", parseFloat),
    });
  }

  constructor({
    delay,
    maxAttempts,
  }: {
    delay?: Duration | null;
    maxAttempts?: number | null;
  }) {
    this.delay = delay ?? Duration.ms(200);
    this.maxAttempts = maxAttempts ?? 5;
  }

  *retry(): Generator<Duration, void, void> {
    yield Duration.seconds(0);
    for (let i = 0; i < this.maxAttempts - 1; i++) {
      yield this.delay;
    }
  }

  debug(gui: GUI): void {
    gui.add(this.delay, "ms", 0, 2000, 100).name("Delay (ms)");
    gui.add(this, "maxAttempts", 1, 10, 1).name("Max Attempts");
  }
}

export class ExponentialStrategy implements RetryStrategy {
  name: RetryStrategyName = "exponential";

  private initialDelay: Duration;
  private exponent: number;
  private maxAttempts: number;
  private jitter: [number, number];

  static fromApplication(application: Application) {
    return new ExponentialStrategy({
      initialDelay: application.getAttribute("initial-delay", (v: string) =>
        Duration.ms(parseFloat(v))
      ),
      exponent: application.getAttribute("exponent", parseFloat),
      maxAttempts: application.getAttribute("max-attempts", parseFloat),
      jitter: application.getAttribute("jitter", (v: string) => {
        let [min, max] = v.split(",").map(parseFloat);
        return [min, max];
      }),
    });
  }

  constructor({
    initialDelay,
    exponent,
    maxAttempts,
    jitter,
  }: {
    initialDelay?: Duration | null;
    exponent?: number | null;
    maxAttempts?: number | null;
    jitter?: [number, number] | null;
  }) {
    this.initialDelay = initialDelay ?? Duration.ms(500);
    this.exponent = exponent ?? 2;
    this.jitter = jitter ?? [0.8, 1.2];
    this.maxAttempts = maxAttempts ?? 5;
  }

  *retry(): Generator<Duration, void, void> {
    yield Duration.seconds(0);
    for (let i = 0; i < this.maxAttempts - 1; i++) {
      let duration = this.initialDelay.ms * Math.pow(this.exponent, i);
      duration = randBetween(
        duration * this.jitter[0],
        duration * this.jitter[1]
      );
      yield Duration.ms(duration);
    }
  }

  private get jitterFactor(): number {
    return this.jitter[1] - 1;
  }

  private set jitterFactor(v: number) {
    this.jitter = [1 - v, 1 + v];
  }

  debug(gui: GUI): void {
    gui.add(this.initialDelay, "ms", 0, 3000, 10).name("Initial Delay (ms)");
    gui.add(this, "exponent", 1, 10, 1).name("Exponent");
    gui.add(this, "jitterFactor", 0, 1, 0.01).name("Jitter");
    gui.add(this, "maxAttempts", 1, 10, 1).name("Max Attempts");
  }
}
