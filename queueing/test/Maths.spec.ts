import { Stats } from "../src/core/Maths";
import { describe, expect, it } from "vitest";
import { property, array, integer, assert } from "fast-check";

describe("Stats", () => {
  it("should generate sensible percentiles", () => {
    assert(
      property(array(integer(), { minLength: 1 }), (values) => {
        const stats = new Stats({ windowSize: 10 });
        for (const v of values) {
          stats.add(v);
        }
        let last = Number.MIN_SAFE_INTEGER;
        for (let i = 0; i <= 100; i++) {
          expect(stats.percentile(i)).toBeGreaterThanOrEqual(last);
          last = stats.percentile(i);
        }
      })
    );
  });
});
