import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-170.js";

describe("P-170 AvengeKidmon", () => {
  it("encodes the alternate Three Musketeers digivolution requirement", () => {
    expect(runtimeCompiledCard("P-170")!.digivolutionRequirement).toEqual([
      { level: 5, texts: ["Three Musketeers"], cost: 4, isAlternate: true },
    ]);
  });

  it("returns three text-matching cards to reduce its play cost by six", () => {
    const replacement = runtimeCompiledCard("P-170")!
      .effects.flatMap((effect) => effect.actions)
      .find((action) => action.kind === "Replacement")!;

    expect(replacement).toMatchObject({
      event: "wouldBePlayed",
      mode: "reduceCost",
      amount: 6,
      cost: {
        kind: "return",
        to: "deckBottom",
        target: {
          count: 3,
          filter: {
            zone: "trash",
            controller: "mine",
            nameOrTrait: [{ tokens: ["Three Musketeers"], match: "text" }],
          },
        },
      },
    });
  });

  it("encodes Raid, Blocker, Retaliation, and the conditional deletion play effect", () => {
    const card = runtimeCompiledCard("P-170")!;
    expect(card.effects.filter((effect) => effect.keywords?.length === 1).flatMap((effect) => effect.keywords)).toEqual(
      [
        { keyword: "Raid", raw: "＜Raid＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
        { keyword: "Retaliation", raw: "＜Retaliation＞" },
      ],
    );

    expect(card.effects.find((effect) => effect.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      optional: true,
      from: ["hand", "trash"],
      target: {
        count: 1,
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          playCostLte: 12,
          nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }],
        },
      },
    });
  });
});
