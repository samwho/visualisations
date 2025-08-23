import { namedTypes } from "ast-types";
import { parse, visit, print } from "recast";
import { SortedList } from "../src/core/Collections";

export const STRING_SEPARATOR = "|-|";

interface Highlight {
  start: number;
  end: number;
  className: string;
  data?: Record<string, string | number>;
}

interface Token {
  type:
    | "Keyword"
    | "Comment"
    | "Identifier"
    | "Literal"
    | "Numeric"
    | "Punctuator";
  value: string;
  loc: namedTypes.SourceLocation;
}

const assignment = [
  "=",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "<<=",
  ">>=",
  ">>>=",
  "++",
  "--",
];

const relational = ["<", ">", "<=", ">=", "instanceof", "in"];
const comparison = ["==", "!=", "===", "!=="];
const arithmetic = ["+", "-", "*", "/", "%", "**", "<<", ">>", ">>>"];

const keywords = [
  "break",
  "case",
  "catch",
  "class",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "finally",
  "for",
  "if",
  "import",
  "in",
  "instanceof",
  "new",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
];

export function highlight(code: string): string {
  const codeLines = code.split("\n");
  const identifiersByLine: Record<number, string[]> = {};
  const expressionsByLine: Record<number, string[]> = {};

  function p2i(pos: namedTypes.Position): number {
    let byte = 0;
    for (let i = 0; i < pos.line - 1; i++) {
      byte += codeLines[i]!.length + 1; // +1 for \n
    }
    return byte + pos.column;
  }

  const ast = parse(code);
  const highlights: Highlight[] = [];

  const tokens: Token[] = ast.tokens;
  for (const token of tokens) {
    const start = p2i(token.loc.start);
    const end = p2i(token.loc.end);
    if (token.type === "Keyword") {
      let className = "z-storage z-type z-ts";
      if (keywords.includes(token.value)) {
        className = "z-keyword z-control z-flow z-ts";
      } else if (token.value === "for") {
        className = "for";
      } else if (token.value === "let" || token.value === "const") {
        className = "z-storage z-type z-ts";
      }
      highlights.push({ start, end, className });
    } else if (token.type === "Comment") {
      highlights.push({ start, end, className: "comment" });
    } else if (token.type === "Punctuator") {
      let className = "z-punctuation";
      if (assignment.includes(token.value)) {
        className = "z-keyword z-operator z-assignment z-ts";
      } else if (relational.includes(token.value)) {
        className = "z-keyword z-operator z-relational z-ts";
      } else if (comparison.includes(token.value)) {
        className = "z-keyword z-operator z-comparison z-ts";
      } else if (arithmetic.includes(token.value)) {
        className = "z-keyword z-operator z-arithmetic z-ts";
      }
      highlights.push({ start, end, className });
    }
  }

  visit(ast, {
    visitIdentifier(path) {
      const { loc } = path.node;
      if (!loc) return;

      const start = p2i(loc.start);
      const end = p2i(loc.end);
      const data: Record<string, string> = {
        name: path.node.name,
        type: "identifier",
      };

      identifiersByLine[loc.start.line] ??= [];
      identifiersByLine[loc.start.line]!.push(path.node.name);

      const parent = path.parentPath.node;
      const grandparent = path.parentPath.parentPath.node;

      let className = "";
      if (namedTypes.VariableDeclarator.check(parent)) {
        className = "z-variable z-other z-readwrite z-ts";
      } else if (namedTypes.FunctionDeclaration.check(parent)) {
        if (parent.id === path.node) {
          className = "z-entity z-name z-function z-ts";
        } else {
          className = "z-variable z-parameter z-ts";
        }
      } else if (namedTypes.ClassDeclaration.check(parent)) {
        className = "class";
      } else if (namedTypes.MemberExpression.check(parent)) {
        if (parent.object === path.node) {
          if (path.node.name[0] === path.node.name[0]?.toUpperCase()) {
            className = "z-support z-constant z-ts";
          }
        } else if (parent.property === path.node) {
          if (namedTypes.CallExpression.check(grandparent)) {
            className = "z-support z-function z-ts";
          }
        }
      } else if (path.name === "callee") {
        className = "z-entity z-name z-function z-ts";
      }
      highlights.push({ start, end, className, data });

      return false;
    },

    visitLiteral(path) {
      const { value, loc } = path.node;
      if (!loc) return;
      const start = p2i(loc.start);
      const end = p2i(loc.end);
      const data: Record<string, string | number> = { type: "literal" };
      if (typeof value === "string") {
        highlights.push({ start, end, className: "z-constant z-string", data });
      } else if (typeof value === "number") {
        highlights.push({
          start,
          end,
          className: "z-constant z-numeric",
          data,
        });
      } else if (value === true) {
        highlights.push({
          start,
          end,
          className: "z-constant z-language z-boolean z-true",
          data,
        });
      } else if (value === false) {
        highlights.push({
          start,
          end,
          className: "z-constant z-language z-boolean z-false",
          data,
        });
      }
      this.traverse(path);
    },

    visitExpression(path) {
      if (
        namedTypes.AssignmentExpression.check(path.node) ||
        namedTypes.UpdateExpression.check(path.node) ||
        (namedTypes.MemberExpression.check(path.node) &&
          namedTypes.CallExpression.check(path.parentPath.node))
      ) {
        this.traverse(path);
        return;
      }

      const { loc } = path.node;
      if (!loc) return;

      const start = p2i(loc.start);
      const end = p2i(loc.end);

      const expression = print(path.node).code;
      expressionsByLine[loc.start.line] ??= [];
      expressionsByLine[loc.start.line]!.push(expression);

      highlights.push({
        start,
        end,
        className: "z-expression",
        data: { type: "expression", expression },
      });
      this.traverse(path);
    },
  });

  highlights.sort((a, b) => a.start - b.start);
  const endings = new SortedList<number>();
  const fragments: string[] = [];

  for (let cursor = 0; cursor < code.length; cursor++) {
    const highlightsAtCursor: Highlight[] = [];
    while (highlights.length > 0 && highlights[0]!.start === cursor) {
      highlightsAtCursor.push(highlights.shift()!);
    }
    for (const { end, className, data = {} } of highlightsAtCursor) {
      let dataStr = "";
      for (const [key, value] of Object.entries(data)) {
        dataStr += ` data-${key}="${value}"`;
      }
      fragments.push(`<span class="${className}"${dataStr}>`);
      endings.add(end - 1);
    }
    fragments.push(code[cursor]!);

    while (endings.size() > 0 && endings.get(0) === cursor) {
      endings.shift();
      fragments.push("</span>");
    }
  }

  const lines = [];
  for (const [i, line] of Object.entries(fragments.join("").split("\n"))) {
    const lineNum = parseInt(i) + 1;
    const identifiers = (identifiersByLine[lineNum] || []).join(
      STRING_SEPARATOR
    );
    const expressions = (expressionsByLine[lineNum] || []).join(
      STRING_SEPARATOR
    );
    lines.push(
      `<span class="line" data-line-num="${lineNum}" data-identifiers="${identifiers}" data-expressions="${expressions}"><span class="before" data-line-num="${lineNum}"></span>${line}<span class="after" data-line-num="${lineNum}"></span></span>`
    );
  }

  return lines.join("\n");
}
