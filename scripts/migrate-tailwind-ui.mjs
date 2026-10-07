import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import ts from "typescript";

const ROOT = process.cwd();
const CSS_FILES = [
  "src/app/globals.css",
  "src/app/core-experience.css",
  "src/app/core-learning-polish.css",
  "src/app/grammar.css",
];
const SOURCE_EXTENSIONS = new Set([".tsx", ".jsx"]);
const dryRun = process.argv.includes("--dry-run");

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

function write(relative, content) {
  fs.mkdirSync(path.dirname(path.join(ROOT, relative)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, relative), content);
}

function walkFiles(directory) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...walkFiles(absolute));
    else result.push(absolute);
  }
  return result;
}

function classAnchor(selector) {
  const match = /(^|[^\\])\.([A-Za-z_][A-Za-z0-9_-]*)/.exec(selector);
  if (!match) return null;
  const dotIndex = match.index + match[1].length;
  return {
    name: match[2],
    index: dotIndex,
    length: match[2].length + 1,
  };
}

function mediaPrefix(condition) {
  const normalized = condition.replace(/\s+/g, " ").trim();
  let match = /^\(min-width:\s*([0-9.]+px)\)$/.exec(normalized);
  if (match) return `min-[${match[1]}]:`;
  match = /^\(max-width:\s*([0-9.]+px)\)$/.exec(normalized);
  if (match) return `max-[${match[1]}]:`;
  if (normalized === "(prefers-reduced-motion: reduce)") return "motion-reduce:";
  return null;
}

function mediaAncestors(node) {
  const conditions = [];
  let parent = node.parent;
  while (parent) {
    if (parent.type === "atrule" && parent.name === "media") {
      conditions.unshift(parent.params);
    }
    parent = parent.parent;
  }
  return conditions;
}

function stripSelectorQuotes(value) {
  return value
    .replace(/=("[^"]*"|'[^']*')/g, (_all, quoted) => "=" + quoted.slice(1, -1))
    .replace(/\s+/g, "_");
}

function escapeArbitraryValue(value) {
  return value
    .trim()
    .replace(/["']/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\s+/g, "_");
}

const styleMap = new Map();
const classRuleCount = new Map();
const unsupportedMedia = new Set();
let declarationOrder = 0;
let mappedSelectors = 0;
let mappedDeclarations = 0;

function addStyle(anchor, key, token, order) {
  let entries = styleMap.get(anchor);
  if (!entries) {
    entries = new Map();
    styleMap.set(anchor, entries);
  }
  entries.set(key, { token, order });
  classRuleCount.set(anchor, (classRuleCount.get(anchor) ?? 0) + 1);
}

function declarationToken(selector, anchor, declaration, mediaConditions) {
  let selectorWithHook =
    selector.slice(0, anchor.index) +
    "&" +
    selector.slice(anchor.index + anchor.length);

  selectorWithHook = stripSelectorQuotes(selectorWithHook);

  let prefix = "";
  for (const condition of mediaConditions) {
    const part = mediaPrefix(condition);
    if (!part) {
      unsupportedMedia.add(condition);
      return null;
    }
    prefix += part;
  }

  const value = escapeArbitraryValue(declaration.value);
  const important = declaration.important ? "!" : "";
  const variant = selectorWithHook === "&" ? "" : "[" + selectorWithHook + "]:";
  return {
    key:
      prefix +
      "|" +
      selectorWithHook +
      "|" +
      declaration.prop,
    token:
      prefix +
      variant +
      "[" +
      declaration.prop +
      ":" +
      value +
      "]" +
      important,
  };
}

function filteredGlobals(root) {
  const output = postcss.root();

  function copyContainer(source, target) {
    for (const node of source.nodes ?? []) {
      if (node.type === "comment") continue;

      if (node.type === "rule") {
        const selectors = postcss.list.comma(node.selector);
        const globalSelectors = selectors.filter((selector) => !classAnchor(selector));
        if (!globalSelectors.length) continue;
        const clone = node.clone();
        clone.selector = globalSelectors.join(",\n");
        target.append(clone);
        continue;
      }

      if (node.type === "atrule") {
        if (node.name === "keyframes" || node.name === "-webkit-keyframes") {
          target.append(node.clone());
          continue;
        }
        if (!node.nodes) {
          target.append(node.clone());
          continue;
        }
        const clone = node.clone({ nodes: [] });
        copyContainer(node, clone);
        if (clone.nodes?.length) target.append(clone);
      }
    }
  }

  copyContainer(root, output);
  return output;
}

const retainedRoots = [];
for (const relative of CSS_FILES) {
  if (!fs.existsSync(path.join(ROOT, relative))) continue;
  const root = postcss.parse(read(relative), { from: relative });

  root.walkRules((rule) => {
    const keyframeParent = (() => {
      let parent = rule.parent;
      while (parent) {
        if (
          parent.type === "atrule" &&
          (parent.name === "keyframes" || parent.name === "-webkit-keyframes")
        ) {
          return true;
        }
        parent = parent.parent;
      }
      return false;
    })();
    if (keyframeParent) return;

    const selectors = postcss.list.comma(rule.selector);
    const declarations = (rule.nodes ?? []).filter((node) => node.type === "decl");
    const media = mediaAncestors(rule);

    for (const selector of selectors) {
      const anchor = classAnchor(selector);
      if (!anchor) continue;
      mappedSelectors += 1;
      for (const declaration of declarations) {
        const converted = declarationToken(selector, anchor, declaration, media);
        if (!converted) continue;
        declarationOrder += 1;
        mappedDeclarations += 1;
        addStyle(anchor.name, converted.key, converted.token, declarationOrder);
      }
    }
  });

  retainedRoots.push(filteredGlobals(root));
}

const classUtilities = new Map(
  [...styleMap.entries()].map(([className, entries]) => [
    className,
    [...entries.values()]
      .sort((a, b) => a.order - b.order)
      .map((entry) => entry.token),
  ]),
);

const sourceFiles = walkFiles(path.join(ROOT, "src")).filter((file) =>
  SOURCE_EXTENSIONS.has(path.extname(file)),
);

const expandedClasses = new Set();
const modifiedFiles = [];
const sourceBefore = new Map(sourceFiles.map((file) => [file, fs.readFileSync(file, "utf8")]));

function expandClassText(text) {
  if (!text.trim()) return text;
  const leading = text.match(/^\s*/)?.[0] ?? "";
  const trailing = text.match(/\s*$/)?.[0] ?? "";
  const core = text.slice(leading.length, text.length - trailing.length || undefined);
  if (!core) return text;

  const original = core.split(/\s+/g);
  const extras = [];
  const seen = new Set(original);
  for (const token of original) {
    const utilities = classUtilities.get(token);
    if (!utilities) continue;
    expandedClasses.add(token);
    for (const utility of utilities) {
      if (seen.has(utility)) continue;
      seen.add(utility);
      extras.push(utility);
    }
  }
  if (!extras.length) return text;
  return leading + [...original, ...extras].join(" ") + trailing;
}

function literalReplacement(sourceFile, node, contentStart, contentEnd, replacements) {
  const oldText = sourceFile.text.slice(contentStart, contentEnd);
  const nextText = expandClassText(oldText);
  if (nextText !== oldText) {
    replacements.push({ start: contentStart, end: contentEnd, text: nextText });
  }
}

function collectClassLiteralReplacements(sourceFile) {
  const replacements = [];

  function visitClassExpression(node) {
    if (ts.isStringLiteral(node)) {
      literalReplacement(sourceFile, node, node.getStart(sourceFile) + 1, node.getEnd() - 1, replacements);
      return;
    }
    if (ts.isNoSubstitutionTemplateLiteral(node)) {
      literalReplacement(sourceFile, node, node.getStart(sourceFile) + 1, node.getEnd() - 1, replacements);
      return;
    }
    if (ts.isTemplateHead(node)) {
      literalReplacement(sourceFile, node, node.getStart(sourceFile) + 1, node.getEnd() - 2, replacements);
      return;
    }
    if (ts.isTemplateMiddle(node)) {
      literalReplacement(sourceFile, node, node.getStart(sourceFile) + 1, node.getEnd() - 2, replacements);
      return;
    }
    if (ts.isTemplateTail(node)) {
      literalReplacement(sourceFile, node, node.getStart(sourceFile) + 1, node.getEnd() - 1, replacements);
      return;
    }
    ts.forEachChild(node, visitClassExpression);
  }

  function visit(node) {
    if (
      ts.isJsxAttribute(node) &&
      node.name.getText(sourceFile) === "className" &&
      node.initializer
    ) {
      if (ts.isStringLiteral(node.initializer)) {
        literalReplacement(
          sourceFile,
          node.initializer,
          node.initializer.getStart(sourceFile) + 1,
          node.initializer.getEnd() - 1,
          replacements,
        );
      } else if (
        ts.isJsxExpression(node.initializer) &&
        node.initializer.expression
      ) {
        visitClassExpression(node.initializer.expression);
      }
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return replacements;
}

function applyReplacements(content, replacements) {
  let next = content;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    next =
      next.slice(0, replacement.start) +
      replacement.text +
      next.slice(replacement.end);
  }
  return next;
}

for (const file of sourceFiles) {
  const content = sourceBefore.get(file);
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.JSX;
  const sourceFile = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
    kind,
  );
  const replacements = collectClassLiteralReplacements(sourceFile);
  const next = applyReplacements(content, replacements);
  if (next !== content) {
    modifiedFiles.push(path.relative(ROOT, file));
    if (!dryRun) fs.writeFileSync(file, next);
  }
}

// Catch static modifier classes that are produced outside a className expression.
// Only expand hyphenated class-only string literals to avoid touching product copy.
for (const file of sourceFiles) {
  let content = dryRun ? sourceBefore.get(file) : fs.readFileSync(file, "utf8");
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.JSX;
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, kind);
  const replacements = [];

  function visit(node) {
    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      node.text.includes("-")
    ) {
      const tokens = node.text.trim().split(/\s+/g);
      if (
        tokens.length > 0 &&
        tokens.every((token) => /^[A-Za-z0-9_-]+$/.test(token)) &&
        tokens.some(
          (token) => token.includes("-") && classUtilities.has(token),
        )
      ) {
        const start = node.getStart(sourceFile) + 1;
        const end = node.getEnd() - 1;
        const oldText = sourceFile.text.slice(start, end);
        const nextText = expandClassText(oldText);
        if (nextText !== oldText) replacements.push({ start, end, text: nextText });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  if (replacements.length) {
    const next = applyReplacements(content, replacements);
    if (next !== content) {
      const relative = path.relative(ROOT, file);
      if (!modifiedFiles.includes(relative)) modifiedFiles.push(relative);
      if (!dryRun) fs.writeFileSync(file, next);
    }
  }
}

const retainedCss = retainedRoots
  .map((root) => root.toString().trim())
  .filter(Boolean)
  .join("\n\n");

const theme = `@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);

@theme {
  --color-uv-bg: #09090b;
  --color-uv-surface: #111114;
  --color-uv-surface-raised: #17171b;
  --color-uv-surface-soft: #1d1d22;
  --color-uv-border: #2a2a31;
  --color-uv-border-strong: #3b3b46;
  --color-uv-text: #f5f5f7;
  --color-uv-text-soft: #b4b4bf;
  --color-uv-text-muted: #7f7f8d;
  --color-uv-primary: #8b7cff;
  --color-uv-primary-strong: #a79dff;
  --color-uv-success: #49c98b;
  --color-uv-danger: #ff6b7a;
  --color-uv-warning: #f0b35b;
}
`;

const globals = theme + "\n" + retainedCss + "\n";

if (!dryRun) {
  write("src/app/globals.css", globals);

  for (const obsolete of CSS_FILES.slice(1)) {
    const absolute = path.join(ROOT, obsolete);
    if (fs.existsSync(absolute)) fs.rmSync(absolute);
  }

  const layoutPath = "src/app/layout.tsx";
  let layout = read(layoutPath);
  layout = layout
    .replace('import "./core-experience.css";\n', "")
    .replace('import "./core-learning-polish.css";\n', "")
    .replace('import "./grammar.css";\n', "");
  write(layoutPath, layout);

  write(
    "postcss.config.mjs",
    `const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
`,
  );
}

const allSourceText = sourceFiles
  .map((file) =>
    dryRun ? sourceBefore.get(file) : fs.readFileSync(file, "utf8"),
  )
  .join("\n");
const unresolved = [...classUtilities.keys()]
  .filter((className) => !expandedClasses.has(className))
  .filter((className) => allSourceText.includes(className))
  .sort();

const dynamicPrefixes = new Set();
for (const file of sourceFiles) {
  const text = dryRun ? sourceBefore.get(file) : fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(/([A-Za-z0-9_-]{4,}[-]{1,2})["'`]\s*\+/g)) {
    dynamicPrefixes.add(match[1]);
  }
  for (const match of text.matchAll(/`([^\`$]*[A-Za-z0-9_-]{4,}[-]{1,2})\$\{/g)) {
    const token = match[1].trim().split(/\s+/).at(-1);
    if (token) dynamicPrefixes.add(token);
  }
}
const dynamicFamilies = [...dynamicPrefixes]
  .map((prefix) => ({
    prefix,
    matchingClasses: [...classUtilities.keys()]
      .filter((className) => className.startsWith(prefix))
      .sort(),
  }))
  .filter((item) => item.matchingClasses.length);

const unresolvedOccurrences = unresolved.map((className) => ({
  className,
  matches: sourceFiles.flatMap((file) => {
    const text = dryRun ? sourceBefore.get(file) : fs.readFileSync(file, "utf8");
    return text
      .split("\n")
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.includes(className))
      .slice(0, 8)
      .map(({ line, index }) => ({
        file: path.relative(ROOT, file),
        line: index + 1,
        snippet: line.trim().slice(0, 240),
      }));
  }).slice(0, 12),
}));

const report = {
  cssFiles: CSS_FILES,
  semanticClasses: classUtilities.size,
  mappedSelectors,
  mappedDeclarations,
  sourceFiles: sourceFiles.length,
  modifiedFiles: modifiedFiles.length,
  expandedClasses: expandedClasses.size,
  unresolvedClassesReferencedInSource: unresolved,
  unresolvedOccurrences,
  dynamicFamilies,
  unsupportedMedia: [...unsupportedMedia],
  retainedGlobalCssLines: globals.split("\n").length,
};

console.log(JSON.stringify(report, null, 2));

if (unsupportedMedia.size) {
  throw new Error(
    "Unsupported media queries remain: " + [...unsupportedMedia].join(", "),
  );
}
