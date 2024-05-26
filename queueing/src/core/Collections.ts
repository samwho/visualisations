export class SortedList<T> {
  private items: T[];
  private compareFn: (a: T, b: T) => number;

  constructor(compareFn?: (a: T, b: T) => number) {
    this.items = [];
    this.compareFn = compareFn || this.defaultCompare;
  }

  private defaultCompare(a: T, b: T): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  public add(item: T): void {
    const index = this.getInsertionIndex(item);
    this.items.splice(index, 0, item);
  }

  public remove(item: T): boolean {
    const index = this.findIndex(item);
    if (index !== -1) {
      this.items.splice(index, 1);
      return true;
    }
    return false;
  }

  public get(index: number): T | undefined {
    return this.items[index];
  }

  public size(): number {
    return this.items.length;
  }

  public clear(): void {
    this.items = [];
  }

  public indexOf(item: T): number {
    return this.findIndex(item);
  }

  public contains(item: T): boolean {
    return this.findIndex(item) !== -1;
  }

  public entries(): IterableIterator<[number, T]> {
    return this.items.entries();
  }

  public withTemporary<R>(extra: T[], f: (s: SortedList<T>) => R): R {
    for (const item of extra) {
      this.add(item);
    }
    const ret = f(this);
    for (const item of extra) {
      this.remove(item);
    }
    return ret;
  }

  public [Symbol.iterator](): IterableIterator<T> {
    return this.items[Symbol.iterator]();
  }

  public toArray(): T[] {
    return this.items.slice();
  }

  private findIndex(item: T): number {
    let low = 0;
    let high = this.items.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const cmp = this.compareFn(item, this.items[mid]);

      if (cmp === 0) {
        return mid;
      } else if (cmp < 0) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    return -1;
  }

  private getInsertionIndex(item: T): number {
    let low = 0;
    let high = this.items.length;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const cmp = this.compareFn(item, this.items[mid]);

      if (cmp <= 0) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }

    return low;
  }
}

export class FixedSizeList<T> {
  private items: T[];
  private maxLength: number;

  constructor(maxLength: number) {
    if (maxLength <= 0) throw new Error("Max length must be greater than 0");
    this.items = [];
    this.maxLength = Math.ceil(maxLength);
  }

  public add(item: T): T | undefined {
    let removed: T | undefined = undefined;
    if (this.items.length === this.maxLength) {
      removed = this.remove();
    }

    this.items.push(item);
    return removed;
  }

  public addAll(items: T[]): T[] {
    const ret: T[] = [];
    for (const item of items) {
      const removed = this.add(item);
      if (removed) {
        ret.push(removed);
      }
    }
    return ret;
  }

  public remove(): T | undefined {
    if (this.items.length === 0) {
      return undefined;
    }

    return this.items.shift();
  }

  public removeAt(index: number): T {
    if (index < 0 || index >= this.items.length) {
      throw new Error("Index out of bounds");
    }
    return this.items.splice(index, 1)[0];
  }

  public get(index: number): T | undefined {
    if (index < 0) {
      return this.items[this.items.length + index];
    }
    return this.items[index];
  }

  public last(): T | undefined {
    return this.items[this.items.length - 1];
  }

  public size(): number {
    return this.items.length;
  }

  public resize(maxLength: number): void {
    this.maxLength = Math.ceil(maxLength);
    const toRemove = this.items.length - this.maxLength;
    if (toRemove > 0) {
      this.items.splice(0, toRemove);
    }
  }

  public clear(): void {
    this.items = [];
  }

  public indexOf(item: T): number {
    return this.items.indexOf(item);
  }

  public contains(item: T): boolean {
    return this.items.includes(item);
  }

  public entries(): IterableIterator<[number, T]> {
    return this.items.entries();
  }

  public toArray(): T[] {
    return this.items.slice();
  }

  public slice(start: number, end: number): T[] {
    return this.items.slice(start, end);
  }
}

export class FixedSizeSortedList<T> extends SortedList<T> {
  private _items: FixedSizeList<T>;

  constructor(maxLength: number, compareFn?: (a: T, b: T) => number) {
    super(compareFn);
    this._items = new FixedSizeList(maxLength);
  }

  public override add(item: T): T | undefined {
    let removed = this._items.add(item);
    if (removed) {
      super.remove(removed);
    }
    super.add(item);
    return removed;
  }

  public override remove(item: T): boolean {
    const i = this._items.indexOf(item);
    if (i === -1) {
      return false;
    }
    this._items.removeAt(i);
    this.remove(item);
    return true;
  }
}
