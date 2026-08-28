import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { allCards } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const pending = [
  "ST20-01",
  "ST20-02",
  "ST20-03",
  "ST20-04",
  "ST20-05",
  "ST20-06",
  "ST20-07",
  "ST20-08",
  "ST20-09",
  "ST20-10",
  "ST20-11",
  "ST20-12",
  "ST20-13",
  "ST20-14",
  "ST20-15",
] as const;

const collectionDirectory = fileURLToPath(new URL(".", import.meta.url));
const indexSource = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const st20Ids = allCards()
  .filter((card) => card.set === "ST20")
  .map((card) => card.cardId)
  .sort();

function containsRawUnparsed(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsRawUnparsed);
  if (value === null || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  return record.kind === "RawUnparsed" || Object.values(record).some(containsRawUnparsed);
}

function effects(cardId: string) {
  const card = runtimeCompiledCard(cardId);
  expect(card, `${cardId} must be registered`).toBeDefined();
  expect(card?.coverage, `${cardId} must have complete IR coverage`).toBe("full");
  expect(card?.residual, `${cardId} must have no parser residual`).toEqual([]);
  return card!.effects;
}

describe("ST20 collection audit proof", () => {
  it("matches the complete committed ST20 catalog inventory", () => {
    expect(st20Ids).toEqual(pending);
  });

  it("keeps every catalog card imported with a direct module and colocated behavioral test", () => {
    for (const cardId of st20Ids) {
      const testSource = readFileSync(`${collectionDirectory}/${cardId}.test.ts`, "utf8");

      expect(
        indexSource.match(new RegExp(`^import "\\./${cardId}\\.js";$`, "gm")),
        `${cardId} index import`,
      ).toHaveLength(1);
      expect(testSource, `${cardId} test suite`).toMatch(/\bdescribe\s*\(/);
      expect(testSource, `${cardId} runnable test`).toMatch(/\bit\s*\(/);
      expect(testSource, `${cardId} engine harness`).toMatch(/\bsetupEngine\s*\(/);
      expect(testSource, `${cardId} observable assertion`).toMatch(/\bexpect\s*\(/);
      expect(testSource, `${cardId} skipped or pending test`).not.toMatch(/\b(?:describe|it|test)\.(?:skip|todo)\s*\(/);
      expect(getEffectModule(cardId), `${cardId} executable module`).toBeDefined();
    }
  });

  it("registers every card exclusively through complete compiled IR", () => {
    for (const cardId of st20Ids) {
      const moduleSource = readFileSync(`${collectionDirectory}/${cardId}.ts`, "utf8");
      const compiled = runtimeCompiledCard(cardId);

      expect(
        moduleSource.match(new RegExp(`\\bregisterIrCard\\s*\\(\\s*["']${cardId}["']\\s*,\\s*compiled\\s*\\)`, "g")),
        `${cardId} exact registerIrCard call`,
      ).toHaveLength(1);
      expect(moduleSource.match(/\bregisterIrCard\s*\(/g), `${cardId} total registerIrCard calls`).toHaveLength(1);
      expect(moduleSource, `${cardId} legacy registerCard call`).not.toMatch(/\bregisterCard\s*\(/);
      expect(hasRegisteredCompiledCard(cardId), `${cardId} direct compiled registration`).toBe(true);
      expect(compiled?.coverage, `${cardId} coverage`).toBe("full");
      expect(compiled?.residual, `${cardId} residual`).toEqual([]);
      expect(containsRawUnparsed(compiled), `${cardId} RawUnparsed node`).toBe(false);
    }
  });

  it.each(pending)("%s has complete executable coverage", (cardId) => {
    expect(effects(cardId).length).toBeGreaterThan(0);
  });

  it("ST20-02 searches only Adventure Tamers or Options in its second slot", () => {
    const reveal = effects("ST20-02").find((effect) => effect.trigger === "OnPlay")!.actions[0];
    expect(reveal).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "hand", filter: { nameOrTrait: [{ tokens: ["ADVENTURE"], match: "trait" }] } },
      ],
    });
  });

  it("ST20-05 defers its security replay until the battle ends", () => {
    expect(effects("ST20-05").find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      timing: "endOfBattle",
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });

  it("ST20-03 evaluates the three-color Adventure Tamer gate structurally", () => {
    const cardEffects = effects("ST20-03");
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(cardEffects.find((effect) => effect.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Digivolve",
        condition: {
          kind: "zoneColorCount",
          cardType: "Tamer",
          op: "gte",
          value: 3,
          filter: { nameOrTrait: [{ tokens: ["ADVENTURE"], match: "trait" }] },
        },
      });
    }
  });

  it.each(["ST20-04", "ST20-06", "ST20-09"])("%s keeps the Alliance watcher once-per-turn", (cardId) => {
    expect(effects(cardId).find((effect) => effect.trigger === "YourTurn")).toMatchObject({ frequency: "OncePerTurn" });
  });

  it("ST20-01 gates its inherited DP bonus on its own Adventure trait", () => {
    expect(effects("ST20-01").find((effect) => effect.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      condition: { kind: "selfTopHasText" },
    });
  });

  it("ST20-04, ST20-06, and ST20-09 keep their mandatory Alliance step separate from optional attack", () => {
    for (const cardId of ["ST20-04", "ST20-06", "ST20-09"]) {
      const watcher = effects(cardId).find((effect) => effect.trigger === "YourTurn")!;
      const subTriggers = watcher.actions.filter((action) => action.kind === "SubTrigger");
      expect(subTriggers.length).toBe(2);
      expect(
        subTriggers.every((action) => action.actions.some((nested) => nested.kind === "Attack" && nested.optional)),
      ).toBe(true);
    }
  });

  it("ST20-07 applies the opponent-only digivolution cost-reduction restriction", () => {
    expect(effects("ST20-07")[0]?.actions[0]).toMatchObject({
      kind: "RestrictCostReduction",
      seat: "opponent",
      costType: "digivolve",
    });
  });

  it("ST20-09 scales suspension by Adventure Tamer colors", () => {
    const suspend = effects("ST20-09")[0]?.actions[1];
    expect(suspend).toMatchObject({
      kind: "Suspend",
      scaling: { per: 2, unit: "colors", filter: { nameOrTrait: [{ tokens: ["ADVENTURE"], match: "trait" }] } },
    });
  });

  it("ST20-10 uses the two printed WarGreymon activation branches", () => {
    expect(effects("ST20-10")[0]?.actions[0]).toMatchObject({
      kind: "Digivolve",
      costOverride: 4,
      ignoreRequirements: true,
      condition: { kind: "orConditions" },
    });
  });

  it("ST20-11 grants effect immunity by Tamer colors and deletes the lowest DP Digimon", () => {
    const cardEffects = effects("ST20-11");
    expect(cardEffects.find((effect) => effect.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "immuneToOpponentDigimonEffects",
      scaling: { per: 2, unit: "colors" },
    });
    expect(cardEffects.filter((effect) => effect.trigger === "WhenDigivolving").at(-1)?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { superlative: "lowestDP" } },
    });
  });

  it("ST20-12 and ST20-13 reduce only Adventure Digimon plays and carry security replay", () => {
    for (const cardId of ["ST20-12", "ST20-13"]) {
      expect(effects(cardId).find((effect) => effect.trigger === "YourTurn")?.actions[0]).toMatchObject({
        kind: "Replacement",
        sourceFilter: { nameOrTrait: [{ tokens: ["ADVENTURE"], match: "trait" }] },
      });
      expect(effects(cardId).find((effect) => effect.trigger === "Security")).toMatchObject({
        isSecurity: true,
        actions: [{ kind: "PlayWithoutCost" }],
      });
    }
  });

  it("ST20-14 preserves color waiver, draw-and-place, Delay replacement, and security placement", () => {
    expect(effects("ST20-14").find((effect) => effect.trigger === "Main")?.actions).toMatchObject([
      { kind: "Draw", amount: 2 },
      { kind: "PlaceInBattleAreaSelf" },
    ]);
    expect(
      effects("ST20-14").find(
        (effect) => effect.trigger === "Main" && effect.keywords?.some((keyword) => keyword.keyword === "Delay"),
      )?.actions[0],
    ).toMatchObject({ kind: "PlayWithoutCost", optional: true, from: ["hand"] });
    expect(effects("ST20-14").find((effect) => effect.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Delay" } }],
    });
    expect(effects("ST20-14").find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlaceInBattleAreaSelf" }],
    });
  });

  it("ST20-15 preserves face-up security waiver, security DP aura, and optional Tamer play", () => {
    expect(effects("ST20-15").find((effect) => effect.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "youHaveNone", filter: { zone: "security", faceUp: true } },
    });
    expect(effects("ST20-15").find((effect) => effect.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
    });
    expect(effects("ST20-15").find((effect) => effect.trigger === "Security")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      optional: true,
      from: ["hand"],
    });
  });
});
