import { parse, visit, print, types } from "recast";
import { namedTypes } from "ast-types";
import { type NodePath } from "ast-types/lib/node-path";

const build = types.builders;

export function transform(code: string): string {
  const ast = parse(code);

  const scopes: Set<string>[] = [new Set()];

  function withNewScope<T>(f: () => T): T {
    scopes.push(new Set());
    const result = f();
    scopes.pop();
    return result;
  }

  function buildScopeProperties() {
    const scope = scopes.reduce((a, s) => a.union(s), new Set());
    return Array.from(scope)
      .map((name) => build.identifier(name))
      .map((id) => build.objectProperty(id, id));
  }

  function insertYieldFor<
    N extends types.namedTypes.Node,
    V extends types.namedTypes.Node
  >(path: NodePath<N, V>) {
    if (!path.node.loc) return;
    const yieldNode = build.yieldExpression(
      build.objectExpression([
        build.objectProperty(
          build.identifier("line"),
          build.numericLiteral(path.node.loc.start.line)
        ),
        ...buildScopeProperties(),
      ])
    );

    let parent = path.parentPath.node as types.namedTypes.Node;
    let body: types.namedTypes.Node[] = [];
    if (namedTypes.IfStatement.check(parent)) {
      if (namedTypes.BlockStatement.check(parent.consequent)) {
        body = parent.consequent.body;
      }
    } else if (namedTypes.BlockStatement.check(parent)) {
      body = parent.body;
    } else if (namedTypes.Program.check(parent)) {
      body = parent.body;
    }

    body.splice(
      body.indexOf(path.node),
      0,
      build.expressionStatement(yieldNode)
    );
  }

  const transformed = visit(ast, {
    visitFunctionDeclaration(path) {
      withNewScope(() => {
        for (const param of path.node.params) {
          if (namedTypes.Identifier.check(param)) {
            const scope = scopes[scopes.length - 1]!;
            scope.add(param.name);
          }
        }
        path.node.generator = true;
        this.traverse(path);
      });
    },
    visitIfStatement(path) {
      insertYieldFor(path);
      this.traverse(path);
    },
    visitStatement(path) {
      insertYieldFor(path);
      this.traverse(path);
    },
    visitForStatement(path) {
      insertYieldFor(path);
      withNewScope(() => this.traverse(path));
    },
    visitForOfStatement(path) {
      insertYieldFor(path);
      withNewScope(() => this.traverse(path));
    },
    visitForInStatement(path) {
      insertYieldFor(path);
      withNewScope(() => this.traverse(path));
    },
    visitBlockStatement(path) {
      withNewScope(() => this.traverse(path));
    },
    visitTryStatement(path) {
      withNewScope(() => this.traverse(path));
    },
    visitCatchClause(path) {
      withNewScope(() => {
        const param = path.node.param;
        if (namedTypes.Identifier.check(param)) {
          const scope = scopes[scopes.length - 1]!;
          scope.add(param.name);
        }
        this.traverse(path);
      });
    },
    visitVariableDeclaration(path) {
      const parent = path.parentPath.node;
      if (
        !namedTypes.ForStatement.check(parent) &&
        !namedTypes.ForOfStatement.check(parent) &&
        !namedTypes.ForInStatement.check(parent)
      ) {
        insertYieldFor(path);
      }

      this.traverse(path);
      const scope = scopes[scopes.length - 1]!;
      for (const declaration of path.node.declarations) {
        switch (declaration.type) {
          case "VariableDeclarator": {
            const id = declaration.id;
            switch (id.type) {
              case "Identifier":
                scope.add(id.name);
                break;
            }
            break;
          }
        }
      }
    },
    visitCallExpression(path) {
      if (path.node.callee.type === "Identifier") {
        path.replace(build.yieldExpression(path.node, true));
      }
      return false;
    },
  });

  return print(transformed).code;
}
