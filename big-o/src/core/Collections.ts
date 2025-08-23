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

  public removeAt(index: number): T | undefined {
    if (index < 0 || index >= this.items.length) {
      return undefined;
    }
    return this.items.splice(index, 1)[0];
  }

  public shift(): T | undefined {
    if (this.items.length === 0) {
      return undefined;
    }
    return this.items.shift();
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
      const cmp = this.compareFn(item, this.items[mid]!);

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
      const cmp = this.compareFn(item, this.items[mid]!);

      if (cmp <= 0) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }

    return low;
  }
}
