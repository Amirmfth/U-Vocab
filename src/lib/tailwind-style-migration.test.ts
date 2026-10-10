import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

function filesUnder(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? filesUnder(fullPath)
      : /\.(tsx|jsx)$/.test(entry.name)
        ? [fullPath]
        : [];
  });
}

const oldArbitraryDeclaration = /\[[a-z-]+:[^\]]+\]/g;
const oldArbitraryVariant = /\[(?:&|@media)[^\]]*\]|(?:min|max)-\[\d+px\]/g;

test("all JSX className values use named Tailwind utilities and variants", () => {
  const failures: Array<{ file: string; text: string }> = [];

  for (const absolutePath of filesUnder(path.resolve("src"))) {
    const source = fs.readFileSync(absolutePath, "utf8");
    const ast = ts.createSourceFile(
      absolutePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      absolutePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.JSX,
    );

    function checkClassText(text: string) {
      const violations = [
        ...text.matchAll(oldArbitraryDeclaration),
        ...text.matchAll(oldArbitraryVariant),
      ];
      for (const violation of violations) {
        failures.push({
          file: path.relative(process.cwd(), absolutePath),
          text: violation[0],
        });
      }
    }

    function checkExpression(node: ts.Node) {
      if (ts.isStringLiteralLike(node)) {
        checkClassText(node.text);
        return;
      }
      ts.forEachChild(node, checkExpression);
    }

    function visit(node: ts.Node) {
      if (
        ts.isJsxAttribute(node) &&
        node.name.text === "className" &&
        node.initializer
      ) {
        checkExpression(node.initializer);
        return;
      }
      ts.forEachChild(node, visit);
    }

    visit(ast);
  }

  assert.deepEqual(
    failures.slice(0, 50),
    [],
    "CSS property brackets or arbitrary selector variants remain in className.",
  );
});
