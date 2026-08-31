import { allCards } from "@aegis/shared";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../engine/effects/interpreter.js";

export const REMAINING_AUDIT_SETS = [
  "AD1",
  "EX3",
  "EX4",
  "P",
  "RB1",
  "ST1",
  "ST2",
  "ST3",
  "ST4",
  "ST5",
  "ST6",
  "ST7",
  "ST8",
  "ST9",
  "ST10",
  "ST13",
  "ST14",
  "ST15",
  "ST16",
  "ST17",
  "ST18",
  "ST19",
  "ST20",
  "ST21",
  "ST22",
  "ST23",
  "ST24",
] as const;

type AuditSet = (typeof REMAINING_AUDIT_SETS)[number];
type LedgerRow = { cardId: string; cells: string[]; line: string };
type RuntimeProof = { set: AuditSet; cardIds: readonly string[]; testFile: string };

const cardsDirectory = fileURLToPath(new URL(".", import.meta.url));
const auditDirectory = fileURLToPath(new URL("../../../../docs/audits/", import.meta.url));

function tableCells(line: string): string[] {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function ledgerRows(source: string): LedgerRow[] {
  return source.split("\n").flatMap((line) => {
    if (!line.startsWith("|")) return [];
    const cells = tableCells(line);
    const cardId = cells[0]?.match(/^([A-Z0-9]+-\d{2,3})(?:\s|$)/)?.[1];
    return cardId === undefined ? [] : [{ cardId, cells, line }];
  });
}

function containsRawUnparsed(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsRawUnparsed);
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.kind === "RawUnparsed" || Object.values(record).some(containsRawUnparsed);
}

function countMatches(source: string, pattern: RegExp): number {
  return source.match(pattern)?.length ?? 0;
}

function switchCaseSource(source: string, cardId: string): string {
  const pattern = new RegExp(`case\\s+["']${cardId}["']\\s*:`, "g");
  const cases: string[] = [];
  for (const match of source.matchAll(pattern)) {
    const remainder = source.slice(match.index);
    const returnIndex = remainder.search(/\breturn\s*;/);
    cases.push(returnIndex < 0 ? remainder : remainder.slice(0, returnIndex + "return;".length));
  }
  return cases.join("\n");
}

function behavioralClauseCount(compiled: NonNullable<ReturnType<typeof runtimeCompiledCard>>): number {
  return compiled.effects.filter((effect) => (effect.actions?.length ?? 0) > 0 || (effect.keywords?.length ?? 0) > 0)
    .length;
}

function catalogFor(set: AuditSet) {
  return allCards()
    .filter((card) => card.set === set)
    .sort((left, right) => left.cardId.localeCompare(right.cardId));
}

export function describeRemainingCollectionAuditContract({
  runtimeProofs,
}: {
  runtimeProofs: readonly RuntimeProof[];
}): void {
  describe("remaining collection audit contract", () => {
    it("matches every ledger row to the exact catalog id, order, and English name", () => {
      let total = 0;
      for (const set of REMAINING_AUDIT_SETS) {
        const catalog = catalogFor(set);
        const ledger = readFileSync(`${auditDirectory}/${set}-AUDIT.md`, "utf8");
        const rows = ledgerRows(ledger);
        total += rows.length;

        expect(
          rows.map(({ cardId }) => cardId),
          `${set} ledger ids`,
        ).toEqual(catalog.map(({ cardId }) => cardId));
        for (const [index, card] of catalog.entries()) {
          const row = rows[index]!;
          const separateName = row.cells[0] === card.cardId && row.cells[1] === card.nameEn;
          const combinedName = row.cells[0] === `${card.cardId} — ${card.nameEn}`;
          expect(separateName || combinedName, `${card.cardId} exact catalog name`).toBe(true);
        }
      }
      expect(total).toBe(776);
    });

    it("requires complete five-part scoring and exact module/test links in every ledger row", () => {
      for (const set of REMAINING_AUDIT_SETS) {
        const ledger = readFileSync(`${auditDirectory}/${set}-AUDIT.md`, "utf8");
        const header = ledger.split("\n").find((line) => /^\| Card/.test(line)) ?? "";
        const headerCarriesScores = countMatches(header, /2\/2/g) >= 5;

        for (const row of ledgerRows(ledger)) {
          const moduleHref = `../../apps/api/src/cards/${set}/${row.cardId}.ts`;
          const testHref = `../../apps/api/src/cards/${set}/${row.cardId}.test.ts`;
          expect(row.line, `${row.cardId} module link`).toContain(`](${moduleHref})`);
          expect(row.line, `${row.cardId} test link`).toContain(`](${testHref})`);
          expect(row.line, `${row.cardId} total`).toMatch(/\*\*10\/10\*\*|(?:^|\|\s*)10\/10(?:\s*\||$)/);
          expect(headerCarriesScores || countMatches(row.line, /2\/2/g) >= 5, `${row.cardId} five scores`).toBe(true);
        }
      }
    });

    it("requires exclusive residual-free IR and a runnable focused proof for all 776 cards", () => {
      const missingRuntimeProofs: string[] = [];
      const insufficientBehavioralDriverFloor: string[] = [];
      const invalidNoEffectExceptions: string[] = [];
      for (const set of REMAINING_AUDIT_SETS) {
        const indexSource = readFileSync(`${cardsDirectory}/${set}/index.ts`, "utf8");
        for (const { cardId } of catalogFor(set)) {
          const moduleSource = readFileSync(`${cardsDirectory}/${set}/${cardId}.ts`, "utf8");
          const testSource = readFileSync(`${cardsDirectory}/${set}/${cardId}.test.ts`, "utf8");
          const supportImport = testSource.match(/import\s*{\s*(\w+Tests)\s*}\s*from\s*["']\.\/([^"']+)\.js["']/);
          const supportSource = supportImport
            ? readFileSync(`${cardsDirectory}/${set}/${supportImport[2]}.ts`, "utf8")
            : "";
          const proofSource = `${testSource}\n${supportSource}`;
          const compiled = runtimeCompiledCard(cardId);

          expect(indexSource.match(new RegExp(`^import "\\./${cardId}\\.js";$`, "gm")), `${cardId} index`).toHaveLength(
            1,
          );
          const literalRegistration = new RegExp(
            `\\bregisterIrCard\\s*\\(\\s*["']${cardId}["']\\s*,\\s*compiled\\s*\\)`,
          ).test(moduleSource);
          const boundRegistration =
            new RegExp(`\\bconst\\s+cardId\\s*=\\s*["']${cardId}["']\\s*;`).test(moduleSource) &&
            /\bregisterIrCard\s*\(\s*cardId\s*,\s*compiled\s*\)/.test(moduleSource);
          expect(literalRegistration || boundRegistration, `${cardId} direct IR`).toBe(true);
          const expectedRegistrationCount = cardId === "ST19-12" ? 2 : 1;
          expect(moduleSource.match(/\bregisterIrCard\s*\(/g), `${cardId} IR count`).toHaveLength(
            expectedRegistrationCount,
          );
          const hasFamiliarTokenRegistration = /registerIrCard\s*\(\s*["']TOKEN-Familiar-Token["']\s*,/.test(
            moduleSource,
          );
          expect(hasFamiliarTokenRegistration, `${cardId} Familiar token registration`).toBe(cardId === "ST19-12");
          expect(moduleSource, `${cardId} legacy registration`).not.toMatch(/\bregisterCard\s*\(/);
          expect(hasRegisteredCompiledCard(cardId), `${cardId} runtime registration`).toBe(true);
          expect(compiled?.coverage, `${cardId} coverage`).toBe("full");
          expect(compiled?.residual, `${cardId} residual`).toEqual([]);
          expect(containsRawUnparsed(compiled), `${cardId} RawUnparsed`).toBe(false);

          const invokesSharedProof =
            supportImport === null || new RegExp(`\\b${supportImport[1]}\\s*\\(`).test(testSource);
          expect(invokesSharedProof, `${cardId} shared proof invocation`).toBe(true);
          expect(proofSource, `${cardId} describe`).toMatch(/\bdescribe\s*\(/);
          expect(proofSource, `${cardId} test`).toMatch(/\b(?:it|test)\s*\(/);
          expect(proofSource, `${cardId} assertion`).toMatch(/\bexpect\s*\(/);
          expect(proofSource, `${cardId} skipped proof`).not.toMatch(/\b(?:describe|it|test)\.(?:skip|todo)\s*\(/);

          if ((compiled?.effects.length ?? 0) === 0) {
            const provesEmptyEffects =
              /effects\s*:\s*\[\s*\]/.test(moduleSource) ||
              /(?:getCompiledCard\([^)]*\)|runtimeCompiledCard\([^)]*\))!?\.effects\)?\.toEqual\(\[\]\)/.test(
                testSource,
              );
            if (!provesEmptyEffects) invalidNoEffectExceptions.push(cardId);
            continue;
          }
          // A shared smoke helper can prove that a card is loadable/playable, but it cannot
          // prove this card's own effect clause. Runtime evidence must live in the card's
          // colocated test so a generic source-zone transition cannot satisfy 10/10.
          const harnessImport = testSource.match(/import\s*{([^}]*)}\s*from\s*["'][^"']*testkit\/harness\.js["']/);
          const setupImport = harnessImport?.[1]?.match(/\bsetupEngine(?:\s+as\s+(\w+))?/);
          const setupName = setupImport?.[1] ?? (setupImport ? "setupEngine" : undefined);
          const invokesHarness = setupName !== undefined && new RegExp(`\\b${setupName}\\s*\\(`).test(testSource);
          const invokesProductionAdvance = /\badvance\s*\([^)]*\.engine\s*\)\s*\./.test(testSource);
          const memoryBoostEvidence =
            supportImport?.[1] === "memoryBoostTests" &&
            new RegExp(`\\b${supportImport[1]}\\s*\\(\\s*{[\\s\\S]*?cardId\\s*:`).test(testSource)
              ? supportSource
              : "";
          const ex4MatrixEvidence =
            supportImport?.[1] === "ex4CardBehaviorTests" ? switchCaseSource(supportSource, cardId) : "";
          const approvedSharedEvidence = memoryBoostEvidence || ex4MatrixEvidence;
          const invokesApprovedSemanticMatrix =
            approvedSharedEvidence.length > 0 &&
            /\bsetupEngine\s*\(/.test(approvedSharedEvidence) &&
            /\b(?:applyIntent|advance|fire|playSubject(?:Card)?)\s*\(/.test(approvedSharedEvidence);
          // Resolver-unit tests with fake GameAccess/Primitives are useful mechanism checks, but
          // they cannot earn a card's behavioral points. Only a card-scoped production harness
          // scenario (direct or an explicitly keyed semantic matrix case) counts here.
          const runtimeEvidenceSource = `${testSource}\n${approvedSharedEvidence}`;
          const observesRuntime =
            /\b(?:settle|observe|advance)\s*\(|\.state\b|\.perm\s*\(|\.events\b|\.decisions\b|\.engine\./.test(
              runtimeEvidenceSource,
            );
          if (!(invokesHarness || invokesProductionAdvance || invokesApprovedSemanticMatrix) || !observesRuntime)
            missingRuntimeProofs.push(cardId);

          const clauseCount = compiled === undefined ? 0 : behavioralClauseCount(compiled);
          const liveScenarioCount = countMatches(runtimeEvidenceSource, /\bsetupEngine\s*\(/g);
          const liveDriverCount = countMatches(
            runtimeEvidenceSource,
            /\.engine\.\w+\s*\(|\badvance\s*\([^)]*\.engine\s*\)\s*\.|\bobserve\s*\([^)]*\.engine\s*\)|\.ready\s*\(\s*\)|\b(?:fire|fireTiming|playSubject(?:Card)?)\s*\(/g,
          );
          // This is a necessary smoke-test floor, not proof that every printed clause has
          // been covered: a driver can exercise multiple effects, or exercise none. The
          // per-card audit remains responsible for mapping each clause to an observable
          // production-harness outcome. A single setup may intentionally exercise several
          // timings, so setup count is diagnostic only and is not itself a threshold.
          const promoNumber = cardId.startsWith("P-") ? Number(cardId.slice(2)) : 0;
          const requiresClauseProof = set === "EX4" || (set === "P" && promoNumber >= 103);
          if (requiresClauseProof && liveDriverCount < clauseCount) {
            insufficientBehavioralDriverFloor.push(
              `${cardId} (${liveScenarioCount} live scenarios/${liveDriverCount} drivers for ${clauseCount} clauses)`,
            );
          }
        }
      }
      expect(invalidNoEffectExceptions, "no-effect cards without explicit empty-IR proof").toEqual([]);
      expect(missingRuntimeProofs, "effect cards without a real engine-harness proof").toEqual([]);
      expect(insufficientBehavioralDriverFloor, "cards below the behavioral-driver smoke-test floor").toEqual([]);
    });

    it("pins runtime proofs for the regression-sensitive multi-step behavior", () => {
      for (const proof of runtimeProofs) {
        const source = readFileSync(`${cardsDirectory}/${proof.set}/${proof.testFile}`, "utf8");
        expect(source, `${proof.testFile} engine harness`).toMatch(/\bsetupEngine\s*\(/);
        expect(source, `${proof.testFile} production operation`).toMatch(
          /\bapplyIntent\s*\(|\bdeletePermanent\s*\(|\bdigivolveFromInstance\s*\(/,
        );
        expect(source, `${proof.testFile} observable state`).toMatch(/\bexpect\s*\(/);
        for (const cardId of proof.cardIds) expect(source, `${cardId} runtime proof`).toContain(cardId);
      }
    });
  });
}
