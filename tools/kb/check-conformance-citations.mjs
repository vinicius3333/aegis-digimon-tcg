#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const DEFAULT_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const CITATION_ID = /^(?:comprehensive|manual|glossary)-\d{4}$/;
const HASH = /^[0-9a-f]{64}$/;
const KNOWN_REVIEW_WARNINGS = [
  {
    file: "ch15-03-targeting-and-selection.test.ts",
    id: "comprehensive-0184",
    pattern: /X cards must be chosen/,
    reason: "note omits the chunk's up-to-X, no-duplicate, and all/overall-processing clauses",
  },
];

function fingerprint(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function literalString(node) {
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return undefined;
}

function sourceText(node, sourceFile) {
  return node ? node.getText(sourceFile) : undefined;
}

function collectConstants(sourceFile) {
  const constants = new Map();
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement) || (statement.declarationList.flags & ts.NodeFlags.Const) === 0) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      const value = literalString(declaration.initializer);
      if (value !== undefined) constants.set(declaration.name.text, value);
    }
  }
  return constants;
}

function collectShadowedNames(sourceFile, constants) {
  const shadowed = new Set();
  function bindingNames(name) {
    if (name === undefined) return [];
    if (ts.isIdentifier(name)) return [name.text];
    if (ts.isBindingElement(name)) return bindingNames(name.name);
    if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name))
      return name.elements.flatMap((element) => (ts.isOmittedExpression(element) ? [] : bindingNames(element.name)));
    return [];
  }
  function visit(node) {
    const declarationIsTopLevel = ts.isVariableDeclaration(node) && node.parent?.parent?.parent === sourceFile;
    const isBinding =
      ts.isVariableDeclaration(node) ||
      ts.isParameter(node) ||
      ts.isCatchClause(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node);
    if (isBinding && !declarationIsTopLevel)
      for (const name of bindingNames(node.name ?? node.variableDeclaration?.name))
        if (constants.has(name)) shadowed.add(name);
    ts.forEachChild(node, visit);
  }
  for (const statement of sourceFile.statements) ts.forEachChild(statement, visit);
  return shadowed;
}

function collectCalls(sourceFile, constants, shadowedNames, chunks) {
  const calls = [];
  const errors = [];
  const noteDiagnostics = [];
  const reviewWarnings = [];
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "cite") {
      const [idNode, noteNode, pinNode] = node.arguments;
      const id = literalString(idNode);
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      if (id === undefined) {
        errors.push({
          kind: "dynamic-id",
          file: sourceFile.fileName,
          line,
          expression: sourceText(idNode, sourceFile),
        });
      } else if (!CITATION_ID.test(id)) {
        errors.push({ kind: "invalid-id", file: sourceFile.fileName, line, id });
      } else if (!chunks.has(id)) {
        errors.push({ kind: "missing-id", file: sourceFile.fileName, line, id });
      } else {
        const chunk = chunks.get(id);
        const rawPin = pinNode && sourceText(pinNode, sourceFile).replace(/[,;]\s*$/, "");
        const shadowed = pinNode && ts.isIdentifier(pinNode) && shadowedNames.has(pinNode.text);
        const pin =
          literalString(pinNode) ??
          (pinNode && ts.isIdentifier(pinNode) && !shadowed ? constants.get(pinNode.text) : undefined);
        const unresolved = pinNode !== undefined && pin === undefined && !shadowed;
        if (pinNode === undefined) errors.push({ kind: "unpinned", file: sourceFile.fileName, line, id });
        if (unresolved)
          errors.push({ kind: "unresolved-pin", file: sourceFile.fileName, line, id, expression: rawPin });
        if (shadowed) errors.push({ kind: "shadowed-pin", file: sourceFile.fileName, line, id, expression: rawPin });
        if (pin !== undefined && !HASH.test(pin))
          errors.push({ kind: "invalid-pin", file: sourceFile.fileName, line, id, fingerprint: pin });
        if (pin !== undefined && HASH.test(pin) && pin !== fingerprint(chunk.text)) {
          errors.push({
            kind: "hash-mismatch",
            file: sourceFile.fileName,
            line,
            id,
            fingerprint: pin,
            expected: fingerprint(chunk.text),
          });
        }
        const note = sourceText(noteNode, sourceFile);
        if (!noteNode)
          noteDiagnostics.push({ id, file: sourceFile.fileName, line, reason: "citation has no review note" });
        for (const warning of KNOWN_REVIEW_WARNINGS) {
          if (sourceFile.fileName.endsWith(warning.file) && id === warning.id && warning.pattern.test(note ?? ""))
            reviewWarnings.push({ id, file: sourceFile.fileName, line, reason: warning.reason });
        }
        calls.push({
          id,
          file: sourceFile.fileName,
          line,
          note,
          fingerprint: pin,
          sourceTitle: chunk.sourceTitle,
          section: chunk.section,
          title: chunk.title,
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return { calls, errors, noteDiagnostics, reviewWarnings };
}

export function checkConformanceCitations({ root = DEFAULT_ROOT } = {}) {
  const index = JSON.parse(readFileSync(join(root, "data/kb/rules-index.json"), "utf8"));
  const chunks = new Map(index.chunks.map((chunk) => [chunk.id, chunk]));
  const directory = join(root, "apps/api/src/engine/conformance");
  // The citation-drift file is an infrastructure probe with intentional dynamic and
  // unknown IDs; it is verified by its own focused tests and is outside the chapter
  // inventory. Keep its exclusion explicit so a future probe cannot disappear silently.
  const conformanceFiles = readdirSync(directory)
    .filter((name) => name.endsWith(".test.ts") && name !== "_kb.meta.test.ts" && name !== "kb-citation-drift.test.ts")
    .map((name) => join(directory, name));
  const cardsDirectory = join(root, "apps/api/src/cards");
  function citedCardTests(path) {
    return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
      const file = join(path, entry.name);
      if (entry.isDirectory()) return citedCardTests(file);
      return entry.name.endsWith(".test.ts") && readFileSync(file, "utf8").includes("cite(") ? [file] : [];
    });
  }
  const cardFiles = existsSync(cardsDirectory) ? citedCardTests(cardsDirectory) : [];
  const files = [...conformanceFiles, ...cardFiles];
  const report = {
    files: files.length,
    conformanceFiles: conformanceFiles.length,
    cardFiles: cardFiles.length,
    calls: [],
    errors: [],
    noteDiagnostics: [],
    reviewWarnings: [],
    disclosure:
      "Static fingerprints establish current source identity only; they do not certify behavioral coverage or citation-note correctness.",
  };
  for (const file of files) {
    const sourceFile = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const constants = collectConstants(sourceFile);
    const result = collectCalls(sourceFile, constants, collectShadowedNames(sourceFile, constants), chunks);
    report.calls.push(...result.calls);
    report.errors.push(...result.errors);
    report.noteDiagnostics.push(...result.noteDiagnostics);
    report.reviewWarnings.push(...result.reviewWarnings);
  }
  report.summary = {
    recognized: report.calls.length,
    pinned: report.calls.filter((call) => call.fingerprint !== undefined && HASH.test(call.fingerprint)).length,
    unpinned: report.errors.filter((error) => error.kind === "unpinned").length,
    unresolved: report.errors.filter((error) => error.kind === "unresolved-pin" || error.kind === "dynamic-id").length,
    mismatches: report.errors.filter((error) => error.kind === "hash-mismatch").length,
    missingNotes: report.noteDiagnostics.length,
    reviewWarnings: report.reviewWarnings.length,
  };
  return report;
}

function main() {
  const json = process.argv.includes("--json");
  const report = checkConformanceCitations({ root: process.cwd() });
  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      JSON.stringify(
        {
          files: report.files,
          conformanceFiles: report.conformanceFiles,
          cardFiles: report.cardFiles,
          summary: report.summary,
          errors: report.errors,
          noteDiagnostics: report.noteDiagnostics,
          reviewWarnings: report.reviewWarnings,
          disclosure: report.disclosure,
        },
        null,
        2,
      ),
    );
  }
  if (report.errors.length > 0) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
