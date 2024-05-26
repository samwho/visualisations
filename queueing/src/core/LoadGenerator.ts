import { Queue } from "../graphics/Queue";
import { Application } from "./Application";
import { Duration } from "./Duration";
import { randBetween } from "./Maths";

export async function* pauseWhenFull(queue: Queue) {
  while (true) {
    await queue.hasSpace();
    yield;
  }
}

export async function* slowWhenNearlyFull(
  queue: Queue,
  {
    min,
    max,
    pauseWhenFull,
  }: { min: number; max: number; pauseWhenFull?: boolean } = {
    min: 0,
    max: 2,
  }
) {
  // The application could be paused, so we need to wait before the first
  // yield. This is a bit of a hack, but it works.
  await queue.application.sleep(Duration.ms(1));
  while (true) {
    yield;
    const percentFull = queue.size / queue.capacity;
    const wait = Duration.seconds(
      Math.min(max, randBetween(min, max) + percentFull * max)
    );
    await queue.application.sleep(wait);
    if (pauseWhenFull) {
      await queue.hasSpace();
    }
  }
}

export async function* constant(application: Application, duration: Duration) {
  // The application could be paused, so we need to wait before the first
  // yield. This is a bit of a hack, but it works.
  await application.sleep(Duration.ms(1));
  while (true) {
    yield;
    await application.sleep(duration);
  }
}
