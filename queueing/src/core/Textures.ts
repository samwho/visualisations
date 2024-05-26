import {
  Application,
  Graphics,
  Rectangle,
  Resource,
  Texture,
} from "pixi.js-legacy";
import { Cache } from "./Cache";

const CACHE = new Cache<Texture<Resource>>();

export class Textures {
  static dotted(app: Application, size: number = 1): Texture<Resource> {
    return CACHE.getOrSet(`dotted-${size}`, () => {
      const p = new Graphics();

      p.beginFill(0xffffff);
      p.drawRect(0, 0, size, size);

      return app.renderer.generateTexture(p, {
        region: new Rectangle(0, 0, size * 2, size * 2),
      });
    });
  }

  static verticalStripes(
    app: Application,
    size: number = 1
  ): Texture<Resource> {
    return CACHE.getOrSet(`verticalStripes-${size}`, () => {
      const p = new Graphics();

      p.beginFill(0xffffff);
      p.drawRect(0, 0, size, size);

      return app.renderer.generateTexture(p, {
        region: new Rectangle(0, 0, size * 2, size),
      });
    });
  }

  static horizontalStripes(
    app: Application,
    size: number = 1
  ): Texture<Resource> {
    return CACHE.getOrSet(`horizontalStripes-${size}`, () => {
      const p = new Graphics();

      p.beginFill(0xffffff);
      p.drawRect(0, 0, size, size);

      return app.renderer.generateTexture(p, {
        region: new Rectangle(0, 0, size, size * 2),
      });
    });
  }

  static diagonalStripes(
    app: Application,
    size: number = 1
  ): Texture<Resource> {
    return CACHE.getOrSet(`diagonalStripes-${size}`, () => {
      const p = new Graphics();

      p.beginFill(0xffffff);
      p.drawRect(0, 0, size, size);
      p.drawRect(size, size, size, size);
      p.drawRect(size * 2, size * 2, size, size);

      return app.renderer.generateTexture(p, {
        region: new Rectangle(0, 0, size * 3, size * 3),
      });
    });
  }

  static checkerboard(app: Application, size: number = 1): Texture<Resource> {
    return CACHE.getOrSet(`checkerboard-${size}`, () => {
      const p = new Graphics();

      p.beginFill(0xffffff);
      p.drawRect(0, 0, size, size);
      p.drawRect(size, size, size, size);

      return app.renderer.generateTexture(p, {
        region: new Rectangle(0, 0, size * 2, size * 2),
      });
    });
  }
}
