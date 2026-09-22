import { describe, expect, it } from "vitest";
import { compiledEffects, type Cost } from "@aegis/shared";
import { isSelfFromFieldPlaceCost } from "./candidates.js";

/**
 * Zones `looseCardsInZone` (targeting/loose.ts) can enumerate. Any other zone falls into its
 * `default: break` and yields no candidates, without an error.
 */
const LOOSE_ZONES = new Set([
  "hand",
  "trash",
  "deck",
  "security",
  "breeding",
  "digivolutionCards",
  "underMyTamers",
  "underTamers",
  "underTamer",
  "underThisTamer",
  "linked",
  "digivolutionCardsOrLinkCards",
]);

const COST_KINDS_USING_LOOSE_SCAN = new Set(["place", "trash", "return", "reveal"]);

function nonLooseZones(cost: Cost): string[] {
  const target = cost.target;
  if (target === undefined) return [];
  const listed = (value: unknown): string[] =>
    value === undefined ? [] : Array.isArray(value) ? (value as string[]) : [value as string];
  return [...listed(target.from), ...listed(target.filter?.zone)].filter((zone) => !LOOSE_ZONES.has(zone));
}

/**
 * Cost shapes naming a non-loose zone that a dedicated route pays, verified at runtime:
 * permanent placement, self placement from the field (ST23-15, ST24-15), trashing or
 * returning a battle-area permanent (BT23-055, BT26-092, BT13-107), and the pay-time
 * self-reducer that places battle-area tops (BT15-102).
 */
function hasDedicatedRoute(cost: Cost, insideSelfPlacementReducer: boolean): boolean {
  if (cost.kind === "place") {
    return cost.targetIsPermanent === true || isSelfFromFieldPlaceCost(cost) || insideSelfPlacementReducer;
  }
  const zone = cost.target?.filter?.zone;
  return (cost.kind === "trash" || cost.kind === "return") && zone === "battleArea";
}

function isSelfPlacementReducer(node: Record<string, unknown>): boolean {
  return (
    node.kind === "Replacement" &&
    node.event === "wouldBePlayed" &&
    node.mode === "reduceCost" &&
    typeof node.amountPerPlaced === "number"
  );
}

function unroutedCosts(root: unknown): Cost[] {
  const found: Cost[] = [];
  const walk = (node: unknown, insideSelfPlacementReducer: boolean): void => {
    if (node === null || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item, insideSelfPlacementReducer);
      return;
    }
    const record = node as Record<string, unknown>;
    const inside = insideSelfPlacementReducer || isSelfPlacementReducer(record);
    const cost = record as unknown as Cost;
    if (
      typeof record.kind === "string" &&
      COST_KINDS_USING_LOOSE_SCAN.has(record.kind) &&
      record.target !== undefined &&
      nonLooseZones(cost).length > 0 &&
      !hasDedicatedRoute(cost, inside)
    ) {
      found.push(cost);
    }
    for (const value of Object.values(record)) walk(value, inside);
  };
  walk(root, false);
  return found;
}

describe("costs naming a zone the loose-card scan cannot see", () => {
  it("all have a dedicated payment route", () => {
    const offenders = Object.entries(compiledEffects).flatMap(([cardId, card]) =>
      unroutedCosts(card).map((cost) => ({ cardId, kind: cost.kind, zones: nonLooseZones(cost), raw: cost.raw })),
    );

    expect(offenders).toEqual([]);
  });

  it("flags a battle-area placement compiled without the permanent shape", () => {
    const cost = {
      kind: "place",
      target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, from: ["battleArea"] },
      raw: "By placing 1 of your Digimon under this Tamer",
    } as Cost;

    expect(unroutedCosts({ effects: [{ actions: [{ kind: "Draw", cost }] }] })).toEqual([cost]);
  });
});
