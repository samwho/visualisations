import {
  SortedList,
  FixedSizeList,
  FixedSizeSortedList,
} from "../src/core/Collections";
import { describe, expect, it } from "vitest";
import { property, array, integer, assert } from "fast-check";

describe("FixedSizeList", () => {
  it("should have a fixed size", () => {
    assert(
      property(integer({ min: 1 }), array(integer()), (size, values) => {
        const list = new FixedSizeList<number>(size);
        for (const v of values) {
          list.add(v);
          expect(list.size()).toBeLessThanOrEqual(size);
        }
      })
    );
  });

  it("should always evict the oldest values", () => {
    assert(
      property(integer({ min: 1 }), array(integer()), (size, values) => {
        const list = new FixedSizeList<number>(size);
        for (const v of values) {
          list.add(v);
        }
        const lastNValues = values.slice(
          Math.max(0, values.length - size),
          values.length
        );
        expect(list.toArray()).toEqual(lastNValues);
      })
    );
  });
});

describe("SortedList", () => {
  it("should be sorted", () => {
    assert(
      property(array(integer()), (values) => {
        const list = new SortedList<number>();
        for (const v of values) {
          list.add(v);
        }
        let last = Number.MIN_SAFE_INTEGER;
        for (const v of list) {
          expect(v).toBeGreaterThanOrEqual(last);
          last = v;
        }
      })
    );
  });
});

describe("FixedSizeSortedList", () => {
  it("should be sorted and have a fixed size", () => {
    assert(
      property(integer({ min: 1 }), array(integer()), (size, values) => {
        const list = new FixedSizeSortedList<number>(size);
        for (const v of values) {
          list.add(v);
          expect(list.size()).toBeLessThanOrEqual(size);
        }
        let last = Number.MIN_SAFE_INTEGER;
        for (const v of list) {
          expect(v).toBeGreaterThanOrEqual(last);
          last = v;
        }
      })
    );
  });

  it("should always evict the oldest values", () => {
    assert(
      property(integer({ min: 1 }), array(integer()), (size, values) => {
        const list = new FixedSizeSortedList<number>(size);
        for (const v of values) {
          list.add(v);
        }
        const lastNValues = values.slice(
          Math.max(0, values.length - size),
          values.length
        );
        expect(list.toArray()).toEqual(expect.arrayContaining(lastNValues));
      })
    );
  });
});
