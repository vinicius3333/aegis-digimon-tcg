import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { allCards, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const collectionDirectory = fileURLToPath(new URL(".", import.meta.url));
const indexSource = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const st19Ids = allCards()
  .filter((card) => /^ST19-\d{2}$/.test(card.cardId))
  .map((card) => card.cardId)
  .sort();

const expectedIds = Array.from({ length: 15 }, (_, index) => `ST19-${String(index + 1).padStart(2, "0")}`);

function effects(cardId: string) {
  const card = runtimeCompiledCard(cardId);
  expect(card, `${cardId} must execute through compiled IR`).toBeDefined();
  expect(card?.coverage, `${cardId} must have full IR coverage`).toBe("full");
  expect(card?.residual, `${cardId} must have no unresolved IR residual`).toEqual([]);
  return card!.effects;
}

describe("ST19 collection audit gate", () => {
  it("has the exact committed catalog inventory in ascending order", () => {
    expect(st19Ids).toEqual(expectedIds);
  });

  it("imports every catalog card through the ST19 index", () => {
    for (const cardId of st19Ids) {
      expect(indexSource.match(new RegExp(`^import "\\./${cardId}\\.js";$`, "gm")), `${cardId} index import`).toHaveLength(1);
    }
  });

  it.each(expectedIds)("%s is registered as complete executable IR", (cardId) => {
    const moduleSource = readFileSync(`${collectionDirectory}/${cardId}.ts`, "utf8");

    expect(moduleSource.match(new RegExp(`\\bregisterIrCard\\s*\\(\\s*["']${cardId}["']\\s*,\\s*compiled\\s*\\)`, "g"))).toHaveLength(1);
    expect(moduleSource, `${cardId} legacy registerCard call`).not.toMatch(/\bregisterCard\s*\(/);
    expect(hasRegisteredCompiledCard(cardId), `${cardId} direct compiled registration`).toBe(true);
    expect(getCompiledCard(cardId), `${cardId} must have committed IR`).toBeDefined();
    expect(effects(cardId).length, `${cardId} must retain executable behavior`).toBeGreaterThan(0);
  });

  it("keeps the ruling-sensitive ST19 clauses in their audited forms", () => {
    expect(effects("ST19-03").find((effect) => effect.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "hand" },
      ],
    });
    expect(effects("ST19-08").find((effect) => effect.trigger === "Security")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      optional: true,
      from: ["hand", "trash"],
      target: { filter: { playCostLte: 4, nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }] } },
    });
    expect(effects("ST19-11").find((effect) => effect.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "ModifyDP", amount: -3000 },
      { kind: "ModifyDP", amount: -3000, condition: { kind: "totalDigimonGte", count: 3 } },
    ]);
    expect(effects("ST19-13").find((effect) => effect.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "addTop",
      cost: { kind: "place", destination: "digivolutionStack", position: "bottom" },
    });
    expect(effects("ST19-15").find((effect) => effect.trigger === "Main")?.actions).toMatchObject([
      { kind: "ModifyDP", amount: -6000 },
      { kind: "ModifyDP", amount: -6000, condition: { kind: "totalDigimonCount", op: "gte", value: 3 } },
    ]);
  });
});
