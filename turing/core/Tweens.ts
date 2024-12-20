import type { Tween } from "@tweenjs/tween.js";

export class Tweens {
  private static instance = new Tweens();

  public static play(tween: Tween): Promise<Tween> {
    tween.start();
    Tweens.instance.register(tween);
    return Tweens.promisify(tween);
  }

  public static promisify(tween: Tween): Promise<Tween> {
    return new Promise((resolve) => {
      tween.onComplete(resolve);
    });
  }

  // biome-ignore lint/suspicious/noExplicitAny: genuinely could be any
  public static endFor(obj: any) {
    for (const tween of Tweens.for(obj)) {
      tween.end();
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: genuinely could be any
  public static for(object: any): Tween[] {
    return Tweens.instance.tweens.filter(
      // @ts-expect-error accessing private object, I accept the risk
      (tween) => tween._object === object,
    );
  }

  public static start() {
    Tweens.instance.start();
  }

  public static stop() {
    Tweens.instance.stop();
  }

  private tweens: Tween[] = [];
  private animationFrameId: number | null = null;

  private constructor() {}

  register(tween: Tween) {
    this.tweens.push(tween);
    this.start();
  }

  start() {
    if (this.animationFrameId) {
      return;
    }

    const update = (time: DOMHighResTimeStamp) => {
      for (let i = 0; i < this.tweens.length; i++) {
        const tween = this.tweens[i]!;
        const finished = !tween.update(time);
        if (finished) {
          this.tweens.splice(i, 1);
          i--;
        }
      }

      if (this.tweens.length > 0) {
        this.animationFrameId = requestAnimationFrame(update);
      } else {
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(update);
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
