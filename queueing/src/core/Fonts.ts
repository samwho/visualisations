import FontFaceObserver from "fontfaceobserver";
import { BitmapFont, BitmapText, IBitmapTextStyle } from "pixi.js-legacy";

export class Fonts {
  private static _init: Promise<void>;

  private static async init() {
    const firaCode = new FontFaceObserver("Suisse Intl Mono");
    await firaCode.load();

    const chars = BitmapFont.ASCII;
    chars.push(["←", "↙"]);
    chars.push(["👈", "👇"]);

    BitmapFont.from(
      "Suisse Intl Mono",
      {
        fontFamily: "Suisse Intl Mono",
        fontSize: 48,
        fill: 0xffffff,
      },
      {
        chars,
        resolution: window.devicePixelRatio,
      }
    );
  }

  static async haveBeenLoaded() {
    if (!Fonts._init) {
      Fonts._init = Fonts.init();
    }
    await Fonts._init;
  }

  static createBitmapText(
    text: string,
    options: Omit<Partial<IBitmapTextStyle>, "fontName" | "fontSize"> = {}
  ) {
    return new BitmapText(text, {
      ...options,
      fontName: "Suisse Intl Mono",
      fontSize: 48,
    });
  }
}
