import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const root = process.cwd();
const require = createRequire(path.join(root, "package.json"));
const ts = require("typescript");
const { matchingEvoCost, matchingAlternateDigivolutionRequirement } = await import(
  path.join(root, "apps/api/dist/engine/cards/cardData.js")
);
const catalog = new Map(
  JSON.parse(fs.readFileSync(path.join(root, "packages/shared/src/cards/data/cards.json"), "utf8")).map((c) => [
    c.cardId,
    c,
  ]),
);
const findings = [];
for (const file of fs.readdirSync(path.join(root, "apps/api/src/cards/BT25")).filter((f) => f.endsWith(".test.ts"))) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(path.join(root, "apps/api/src/cards/BT25", file), "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const vars = new Map();
  const prop = (n, k) => n.properties?.find((p) => p.name?.getText(source) === k)?.initializer;
  function val(n) {
    if (!n) return;
    if (ts.isStringLiteral(n)) return n.text;
    if (ts.isIdentifier(n)) return vars.get(n.text);
    if (ts.isObjectLiteralExpression(n)) return val(prop(n, "card"));
  }
  function collect(n) {
    if (ts.isVariableDeclaration(n) && n.initializer && ts.isStringLiteral(n.initializer))
      vars.set(n.name.getText(source), n.initializer.text);
    ts.forEachChild(n, collect);
  }
  collect(source);
  function visit(n) {
    if (ts.isObjectLiteralExpression(n)) {
      const under = prop(n, "under"),
        top = val(prop(n, "card"));
      if (top && under && ts.isArrayLiteralExpression(under) && catalog.get(top)?.kinds.includes("Digimon")) {
        const ids = under.elements.map(val);
        ids.push(top);
        for (let i = 1; i < ids.length; i++) {
          const a = catalog.get(ids[i - 1]),
            b = catalog.get(ids[i]);
          if (!a || !b || !a.kinds.some((k) => ["Digimon", "DigiEgg"].includes(k))) continue;
          if (!matchingEvoCost(b, a) && !matchingAlternateDigivolutionRequirement(b, a)) {
            const pos = source.getLineAndCharacterOfPosition(n.getStart(source));
            findings.push({
              file,
              line: pos.line + 1,
              base: a.cardId,
              baseLevel: a.level,
              top: b.cardId,
              topLevel: b.level,
              note: "No printed/alternate evolution match; inspect explicit effect placement or fusion before deciding invalid.",
            });
          }
        }
      }
    }
    ts.forEachChild(n, visit);
  }
  visit(source);
}
if (process.argv.includes("--json")) {
  console.log(JSON.stringify(findings, null, 2));
  process.exit(0);
}
for (const f of findings) console.log(`${f.file}:${f.line} ${f.base}(Lv${f.baseLevel}) -> ${f.top}(Lv${f.topLevel})`);
console.log(
  `${findings.length} candidate stack transitions require contextual review; this is not an automated failure verdict.`,
);
