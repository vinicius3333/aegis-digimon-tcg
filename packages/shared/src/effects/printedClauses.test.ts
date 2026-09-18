import { describe, expect, it } from "vitest";
import { getCardDefinition } from "../cards/registry.js";
import type { CardEffect } from "./ir/card.js";
import { printedClauseForEffect, printedClauseForWatcher, splitPrintedClauses } from "./printedClauses.js";

const definitionOf = (cardId: string) => {
  const definition = getCardDefinition(cardId);
  if (definition === undefined) throw new Error(`missing ${cardId}`);
  return definition;
};

describe("splitPrintedClauses", () => {
  it("groups adjacent timing brackets into one clause and skips the preamble", () => {
    const clauses = splitPrintedClauses(definitionOf("EX13-023").effectText);
    expect(clauses.map((clause) => [...clause.labels])).toEqual([
      ["On Play", "When Digivolving", "When Attacking"],
      ["On Play", "When Digivolving"],
      ["All Turns"],
    ]);
  });

  it("splits clauses printed on one line without separators", () => {
    const clauses = splitPrintedClauses(definitionOf("BT11-112").effectText);
    expect(clauses.map((clause) => clause.text.slice(0, 12))).toEqual(["[On Play] Un", "[All Turns] ", "[Your Turn]["]);
  });

  it("does not treat a timing named mid-sentence as a clause boundary", () => {
    const clauses = splitPrintedClauses(definitionOf("BT11-112").effectText);
    expect(clauses[1]!.text).toContain("[When Digivolving] effects");
  });
});

describe("printedClauseForEffect", () => {
  const orientation: CardEffect = {
    trigger: "WhenDigivolving",
    actions: [{ kind: "Modal", choose: 1, options: [], raw: "1 of your Digimon may change orientation" }],
  };
  const returnFewest: CardEffect = {
    trigger: "WhenDigivolving",
    actions: [
      {
        kind: "Return",
        target: { filter: {}, count: "all" },
        to: "deckBottom",
        raw: "return all of your opponent's Digimon with the fewest digivolution cards to the bottom of the deck",
      },
    ],
  };

  it("tells two clauses under the same bracket apart by their raw fragments", () => {
    const definition = definitionOf("EX13-023");
    expect(printedClauseForEffect({ definition, effect: orientation })).toMatch(/^\[On Play\] \[When Digivolving\] \[When Attacking\]/);
    expect(printedClauseForEffect({ definition, effect: returnFewest })).toMatch(/^\[On Play\] \[When Digivolving\] You may return/);
  });

  it("returns nothing when the raw fragments cannot pick one clause", () => {
    const definition = definitionOf("EX13-023");
    expect(printedClauseForEffect({ definition, effect: { trigger: "WhenDigivolving", actions: [] } })).toBeUndefined();
  });

  it("returns the only clause printed under the bracket", () => {
    const definition = definitionOf("BT11-112");
    expect(printedClauseForEffect({ definition, effect: { trigger: "OnPlay", actions: [] } })).toMatch(/^\[On Play\] Until/);
  });
});

describe("printedClauseForWatcher", () => {
  it("picks the continuous clause by the watcher's event phrase", () => {
    const definition = definitionOf("BT11-112");
    const effect: CardEffect = { trigger: "Static", actions: [] };
    expect(printedClauseForWatcher({ definition, effect, event: "whenUnsuspended", action: {} })).toMatch(
      /^\[Your Turn\]\[Once Per Turn\] When one of your blue Digimon becomes unsuspended/,
    );
    expect(printedClauseForWatcher({ definition, effect, event: "whenSuspended", action: {} })).toMatch(
      /^\[All Turns\] When one of your Digimon with \[Veedramon\]/,
    );
  });

  it("ignores watchers installed by a triggered clause", () => {
    const definition = definitionOf("BT11-112");
    expect(
      printedClauseForWatcher({ definition, effect: { trigger: "OnPlay", actions: [] }, event: "whenSuspended", action: {} }),
    ).toBeUndefined();
  });
});

describe("printedClauseForEffect with requireHints", () => {
  it("does not hand a lone printed clause to an effect without matching raw fragments", () => {
    const definition = definitionOf("BT11-112");
    expect(
      printedClauseForEffect({ definition, effect: { trigger: "OnPlay", actions: [] }, requireHints: true }),
    ).toBeUndefined();
  });
});
