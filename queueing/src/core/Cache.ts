export class Cache<T> {
  private _cache: { [key: string]: T } = {};

  public get(key: string): T | undefined {
    return this._cache[key];
  }

  public set(key: string, value: T) {
    this._cache[key] = value;
  }

  public delete(key: string) {
    delete this._cache[key];
  }

  public getOrSet(key: string, fn: () => T): T {
    if (key in this._cache) {
      return this._cache[key];
    }

    const value = fn();
    this._cache[key] = value;
    return value;
  }
}
