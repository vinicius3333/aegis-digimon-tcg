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
  "ST12",
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
type CardSection = { cardId: string; name: string; body: string };
type RuntimeProof = { set: AuditSet; cardIds: readonly string[]; testFile: string };

const cardsDirectory = fileURLToPath(new URL(".", import.meta.url));
const auditDirectory = fileURLToPath(new URL("../../../../docs/audits/", import.meta.url));

// Narrative ledgers preserve historical worker rubrics separately from coordinator
// closeout. Validate their category identity and arithmetic without awarding delivery.
const NARRATIVE_RUBRIC_SETS = new Set<AuditSet>(["EX3", "EX4"]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cardSections(set: AuditSet, source: string): CardSection[] {
  const heading = new RegExp(`^### (${escapeRegExp(set)}-\\d{2,3}) — (.+)$`, "gm");
  const matches = [...source.matchAll(heading)];
  return matches.map((match, index) => {
    const start = match.index! + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1]!.index! : source.length;
    return { cardId: match[1]!, name: match[2]!.trim(), body: source.slice(start, end) };
  });
}

function hasModuleReference(set: AuditSet, cardId: string, body: string): boolean {
  const pattern = new RegExp(`(?:apps/api/src/cards/${escapeRegExp(set)}/)?${escapeRegExp(cardId)}\\.ts\\b`);
  return pattern.test(body);
}

function hasTestReference(set: AuditSet, cardId: string, body: string): boolean {
  const pattern = new RegExp(`(?:apps/api/src/cards/${escapeRegExp(set)}/)?${escapeRegExp(cardId)}\\.test\\.ts\\b`);
  return pattern.test(body);
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

// Worker rubric blocks score four 2/2 components and leave "Delivery gates" at 0/2,
// awarded collection-wide by the coordinator once every card clears 8/8.
export function assertNarrativeRubricScore(cardId: string, body: string): void {
  const plain = body.replace(/\*/g, "");
  const compact =
    plain.match(/Worker score:\s*([a-z][^\n.]*\/2[^\n.]*)(?:\.|$)/im) ??
    plain.match(/Worker score:\s*[^\s]+\/10\s*\(([^)]*\/2[^)]*)\)/im);
  let rubric: string;
  const components: { category: string; value: number }[] = [];
  if (compact !== null) {
    rubric = compact[0];
    for (const rating of compact[1]!.matchAll(/([^,;]+?)\s+([^\s]+)\/2\b(?!\/|[.,]\d)/g)) {
      const label = rating[1]!.replace(/\([^)]*\)/g, "").trim();
      if (/^reproducibility$/i.test(label)) {
        if (!/reproducibility\s+[^\s]+\/2[^.]*\bunscored\b/i.test(compact[1]!)) {
          throw new Error(`${cardId} reproducibility must be explicitly unscored`);
        }
        continue;
      }
      if (!/^\d+$/.test(rating[2]!)) throw new Error(`${cardId} invalid rubric rating`);
      components.push({ category: rubricCategory(label), value: Number(rating[2]) });
    }
    const claim = plain.match(/Worker claim:\s*([^\s]+)\/10\b/);
    if (claim !== null) rubric += `\nWorker total: ${claim[1]}/10`;
  } else {
    const firstRating = plain.match(/^(?:- [^:\n]+:\s*[^\s]+\/2\b|\|[^|\n]+\|\s*[^\s|]+\/2\b)/m);
    if (firstRating === null) throw new Error(`${cardId} missing narrative rubric`);
    const prefix = plain.slice(0, firstRating.index);
    const lastHeading = [...prefix.matchAll(/^#{2,4} .*$/gm)].at(-1);
    rubric = plain.slice(lastHeading?.index ?? firstRating.index).split(/\n#{2,4} /)[0]!;
    for (const line of rubric.split("\n")) {
      const rating =
        line.match(/^\|\s*([^|]+)\|\s*([^\s|]+)\/2\b(?!\/|[.,]\d)/) ??
        line.match(/^-\s*([^:]+):\s*([^\s]+)\/2\b(?!\/|[.,]\d)/);
      if (rating !== null) {
        if (!/^\d+$/.test(rating[2]!)) throw new Error(`${cardId} invalid rubric rating`);
        components.push({ category: rubricCategory(rating[1]!), value: Number(rating[2]) });
      }
    }
  }
  try {
    assertRubricCategories(components.map(({ category }) => category));
  } catch (error) {
    throw new Error(`${cardId}: ${String(error)}`, { cause: error });
  }
  const sum = components.reduce((total, { value }) => total + value, 0);
  const totals = [
    ...rubric.matchAll(/(?:Worker (?:total|score)|Total|Score)\s*(?:\||:)\s*([^\s|]+)\/10\b(?!\/|[.,]\d)/gi),
  ];
  if (
    components.some(({ value }) => value > 2) ||
    totals.some((total) => !/^\d+$/.test(total[1]!) || Number(total[1]) !== sum)
  ) {
    throw new Error(`${cardId} worker total must equal five integer component ratings`);
  }
  if (components.find(({ category }) => category === "delivery")?.value !== 0) {
    throw new Error(`${cardId} historical worker delivery gates must remain zero`);
  }
}

function rubricCategory(label: string): string {
  const normalized = label
    .trim()
    .replace(/^\.\s*/, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (/^catalog(?:\s*\/\s*| and )rules\b/.test(normalized)) return "catalogRules";
  if (/^catalog\b/.test(normalized)) return "catalog";
  if (/^(?:kb|rules)\b/.test(normalized)) return "rules";
  if (/^(?:compiled )?ir\b/.test(normalized)) return "ir";
  if (/^(?:focused )?behavior(?:al)?\b/.test(normalized)) return "behavior";
  if (/^(?:peer(?:\s*\/\s*| and )(?:evolution[- ]?)?stack|stack)\b/.test(normalized)) return "stack";
  if (/^(?:delivery|gates)\b/.test(normalized)) return "delivery";
  throw new Error(`Unknown rubric category: ${label.trim()}`);
}

function assertRubricCategories(categories: string[]): void {
  const key = [...categories].sort().join(",");
  const schemas = [
    ["catalogRules", "ir", "behavior", "stack", "delivery"],
    ["catalog", "rules", "ir", "behavior", "delivery"],
    ["catalog", "rules", "ir", "behavior", "stack"],
  ];
  if (!schemas.some((schema) => schema.sort().join(",") === key)) {
    throw new Error(`Ledger must contain five distinct rubric categories in a documented schema (${key})`);
  }
}

/** Read the authoritative current score, never a superseded score in its history. */
export function standardLedgerScore({ body, verified = false }: { body: string; verified?: boolean }): number {
  const reported = body.match(/^- Current score:.*$/m) ?? body.match(/^- Score:.*$/m);
  const scoreText = reported?.[0].match(
    /^- (?:Current score|Score):\s*(?:capped at\s+)?\*{0,2}([^\s*·;:()]+)\/10\b(?!\/|[.,]\d)/,
  )?.[1];
  if (reported === null || scoreText === undefined) throw new Error("Missing current ledger score");
  const clauseLine = body.match(/^- Clause scores:.*$/m);
  const componentText = clauseLine?.[0] ?? (reported[0].includes("/2") ? reported[0] : body.slice(0, reported.index));
  const ratingTexts = [...componentText.matchAll(/([^\s*·;:()]+)\/2\b(?!\/|[.,]\d)/g)].map((match) => match[1]!);
  if (![scoreText, ...ratingTexts].every((value) => /^\d+$/.test(value))) {
    throw new Error("Ledger score must equal five integer component ratings out of two");
  }
  const components = ratingTexts.map(Number);
  const score = Number(scoreText);
  if (
    components.length !== 5 ||
    components.some((value) => value > 2) ||
    score > 10 ||
    components.reduce((sum, value) => sum + value, 0) !== score
  ) {
    throw new Error("Ledger score must equal five component ratings out of two");
  }
  if (verified && score !== 10) throw new Error("Verified collection contains an incomplete card score");
  const ratings = [...componentText.matchAll(/([^\s*·;:()]+)\/2\b(?!\/|[.,]\d)/g)];
  let previousEnd = 0;
  const categories = ratings.map((rating) => {
    const prefix =
      componentText
        .slice(previousEnd, rating.index)
        .split(/[\n·;,()—|]/)
        .at(-1) ?? "";
    previousEnd = rating.index! + rating[0].length;
    return rubricCategory(
      prefix
        .replace(/^\s*-\s*/, "")
        .replace(/^Clause scores:\s*/, "")
        .replace(/[:*]/g, "")
        .trim(),
    );
  });
  assertRubricCategories(categories);
  return score;
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
        const source = readFileSync(`${auditDirectory}/${set}.md`, "utf8");
        const sections = cardSections(set, source);
        total += sections.length;

        expect(
          sections.map(({ cardId }) => cardId),
          `${set} ledger ids`,
        ).toEqual(catalog.map(({ cardId }) => cardId));
        for (const [index, card] of catalog.entries()) {
          expect(sections[index]?.name, `${card.cardId} exact catalog name`).toBe(card.nameEn);
        }
      }
      expect(total).toBe(798);
    });

    it("requires complete five-part scoring and exact module/test links in every ledger row", () => {
      for (const set of REMAINING_AUDIT_SETS) {
        const source = readFileSync(`${auditDirectory}/${set}.md`, "utf8");
        const narrative = NARRATIVE_RUBRIC_SETS.has(set);

        for (const { cardId, body } of cardSections(set, source)) {
          expect(hasModuleReference(set, cardId, body), `${cardId} module reference`).toBe(true);
          expect(hasTestReference(set, cardId, body), `${cardId} test reference`).toBe(true);

          if (narrative) assertNarrativeRubricScore(cardId, body);
          else standardLedgerScore({ body, verified: /^status: verified$/m.test(source) });
        }
      }
    });

    it("requires exclusive residual-free IR and a runnable focused proof for all 798 cards", () => {
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
