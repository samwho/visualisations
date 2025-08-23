import { describe, it, expect } from "bun:test";
import { Debugger } from "./debugger";

function dedent(code: string): string {
  const lines = code.split("\n");
  const minIndent = Math.min(
    ...lines
      .filter((line) => line.trim())
      .map((line) => line.match(/^\s*/)?.[0].length || 0)
  );
  return lines
    .map((line) => line.slice(minIndent))
    .join("\n")
    .trim();
}

function format(code: string): string {
  return dedent(code.trim());
}

describe("Debugger", () => {
  it("can handle single function call", () => {
    const code = format(`
      function foo() {
        const x = 1;
        return x;
      }
      foo();
    `);
    expect(new Debugger(code).run()).toEqual([
      { line: 5 },
      { line: 2 },
      { line: 3, x: 1 },
    ]);
  });

  it("can call functions", () => {
    const code = format(`
      function bar() {
        return 2;
      }
      function foo() {
        const x = bar();
        return x;
      }
      foo();
    `);
    expect(new Debugger(code).run()).toEqual([
      { line: 8 },
      { line: 5 },
      { line: 2 },
      { line: 6, x: 2 },
    ]);
  });

  it("can handle for loops", () => {
    const code = format(`
      function foo() {
        let sum = 0;
        for (let i = 0; i < 5; i++) {
          sum += i;
        }
        return sum;
      }
      foo();
    `);
    expect(new Debugger(code).run()).toEqual([
      { line: 8 },
      { line: 2 },
      { line: 3, sum: 0 },
      { line: 4, i: 0, sum: 0 },
      { line: 4, i: 1, sum: 0 },
      { line: 4, i: 2, sum: 1 },
      { line: 4, i: 3, sum: 3 },
      { line: 4, i: 4, sum: 6 },
      { line: 6, sum: 10 },
    ]);
  });

  it("can handle for-of loops", () => {
    const code = format(`
      function foo() {
        const arr = [1, 2, 3];
        let sum = 0;
        for (const i of arr) {
          sum += i;
        }
        return sum;
      }
      foo();
    `);
    expect(new Debugger(code).run()).toEqual([
      { line: 9 },
      { line: 2 },
      { line: 3, arr: [1, 2, 3] },
      { line: 4, arr: [1, 2, 3], sum: 0 },
      { line: 5, arr: [1, 2, 3], i: 1, sum: 0 },
      { line: 5, arr: [1, 2, 3], i: 2, sum: 1 },
      { line: 5, arr: [1, 2, 3], i: 3, sum: 3 },
      { line: 7, arr: [1, 2, 3], sum: 6 },
    ]);
  });

  it("can handle for-in loops", () => {
    const code = format(`
      function foo() {
        const obj = { a: 1, b: 2 };
        let sum = 0;
        for (const key in obj) {
          sum += obj[key];
        }
        return sum;
      }
      foo();
    `);
    expect(new Debugger(code).run()).toEqual([
      { line: 9 },
      { line: 2 },
      { line: 3, obj: { a: 1, b: 2 } },
      { line: 4, obj: { a: 1, b: 2 }, sum: 0 },
      { line: 5, obj: { a: 1, b: 2 }, key: "a", sum: 0 },
      { line: 5, obj: { a: 1, b: 2 }, key: "b", sum: 1 },
      { line: 7, obj: { a: 1, b: 2 }, sum: 3 },
    ]);
  });

  it("can handle nested functions", () => {
    const code = format(`
      function outer() {
        function inner() {
          return 3;
        }
        return inner();
      }
      outer();
    `);
    expect(new Debugger(code).run()).toEqual([
      { line: 7 },
      { line: 5 },
      { line: 3 },
    ]);
  });

  it("can handle while loops", () => {
    const code = format(`
      function foo() {
        let sum = 0;
        let i = 0;
        while (i < 5) {
          sum += i;
          i++;
        }
        return sum;
      }
      foo();
    `);
    expect(new Debugger(code).run()).toEqual([
      { line: 10 },
      { line: 2 },
      { line: 3, sum: 0 },
      { line: 4, sum: 0, i: 0 },
      { line: 5, sum: 0, i: 0 },
      { line: 6, sum: 0, i: 0 },
      { line: 5, sum: 0, i: 1 },
      { line: 6, sum: 1, i: 1 },
      { line: 5, sum: 1, i: 2 },
      { line: 6, sum: 3, i: 2 },
      { line: 5, sum: 3, i: 3 },
      { line: 6, sum: 6, i: 3 },
      { line: 5, sum: 6, i: 4 },
      { line: 6, sum: 10, i: 4 },
      { line: 8, sum: 10, i: 5 },
    ]);
  });

  it("can handle if statements", () => {
    const code = format(`
      function foo() {
        const x = 1;
        if (x > 0) {
          return x;
        } else {
          return -x;
        }
      }
      foo();
    `);
    expect(new Debugger(code).run()).toEqual([
      { line: 9 },
      { line: 2 },
      { line: 3, x: 1 },
      { line: 4, x: 1 },
    ]);
  });

  it("can handle else if statements", () => {
    const code = format(`
      function foo() {
        const x = -1;
        if (x > 0) {
          return x;
        } else if (x < 0) {
          return -x;
        } else {
          return 0;
        }
      }
      foo();
    `);
    expect(new Debugger(code).run()).toEqual([
      { line: 11 },
      { line: 2 },
      { line: 3, x: -1 },
      { line: 6, x: -1 },
    ]);
  });

  it("can handle else statements", () => {
    const code = format(`
      function foo() {
        const x = -1;
        if (x > 0) {
          return x;
        } else {
          return -x;
        }
      }
      foo();
    `);
    expect(new Debugger(code).run()).toEqual([
      { line: 9 },
      { line: 2 },
      { line: 3, x: -1 },
      { line: 6, x: -1 },
    ]);
  });

  it("can handle try-catch statements", () => {
    const code = format(`
      function foo() {
        try {
          throw new Error("test");
        } catch (e) {
          return e.message;
        }
      }
      foo();
    `);
    expect(new Debugger(code).run()).toEqual([
      { line: 8 },
      { line: 3 },
      { line: 5, e: expect.any(Error) },
    ]);
  });

  it("can handle top level stuff", () => {
    const code = format(`
      let sum = 0;
      let i = 0;
      while (i < 5) {
        sum += i;
        i++;
      }
    `);
    expect(new Debugger(code).run()).toEqual([
      { line: 1 },
      { line: 2, sum: 0 },
      { line: 3, sum: 0, i: 0 },
      { line: 4, sum: 0, i: 0 },
      { line: 5, sum: 0, i: 0 },
      { line: 4, sum: 0, i: 1 },
      { line: 5, sum: 1, i: 1 },
      { line: 4, sum: 1, i: 2 },
      { line: 5, sum: 3, i: 2 },
      { line: 4, sum: 3, i: 3 },
      { line: 5, sum: 6, i: 3 },
      { line: 4, sum: 6, i: 4 },
      { line: 5, sum: 10, i: 4 },
    ]);
  });

  it("adds function arguments to the scope", () => {
    const code = format(`
      function foo(a, b) {
        return a + b;
      }
      foo(1, 2);
    `);
    expect(new Debugger(code).run()).toEqual([
      { line: 4 },
      { line: 2, a: 1, b: 2 },
    ]);
  });

  it("handles function args in nested functions", () => {
    const code = format(`
      function outer(a) {
        function inner(b) {
          return a + b;
        }
        return inner(2);
      }
      outer(1);
    `);
    expect(new Debugger(code).run()).toEqual([
      { line: 7 },
      { line: 5, a: 1 },
      { line: 3, a: 1, b: 2 },
    ]);
  });
});
