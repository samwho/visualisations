import { Sprite, Texture } from "pixi.js-legacy";

export class Icons {
  static pointer(
    { width, height }: { width: number; height: number } = {
      width: 100,
      height: 100,
    }
  ): Sprite {
    const texture = Texture.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m9 9 5 12 1.8-5.2L21 14Z" fill="white" />
      </svg>`
    );
    return new Sprite(texture);
  }
}
