import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT1-041.js";
import "./BT1-042.js";
import "./BT1-043.js";
import "./BT1-044.js";
import "./BT1-045.js";
import "./BT1-046.js";
import "./BT1-047.js";
import "./BT1-048.js";
import "./BT1-049.js";
import "./BT1-050.js";

const card = (cardId: string) => runtimeCompiledCard(cardId);

describe("BT1-041 through BT1-050 IR coverage", () => {
  it("registers every card with complete executable coverage", () => {
    for (const cardId of [
      "BT1-041",
      "BT1-042",
      "BT1-043",
      "BT1-044",
      "BT1-045",
      "BT1-046",
      "BT1-047",
      "BT1-048",
      "BT1-049",
      "BT1-050",
    ]) {
      expect(card(cardId), `${cardId} must register compiled IR`).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("preserves every printed trigger, target, boundary, and inherited clause", () => {
    expect(card("BT1-041")?.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Draw", controller: "mine", amount: 2 }],
    });
    expect(card("BT1-041")?.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "opponentHas",
            filter: { kind: ["Digimon"], zone: "battleArea", digivolutionCards: "none" },
          },
        },
      ],
    });

    expect(card("BT1-042")?.effects).toEqual([]);
    expect(card("BT1-043")?.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashDigivolution",
          amount: 4,
          fromTop: false,
          target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" }, count: 1 },
        },
      ],
    });

    expect(card("BT1-044")?.effects[0]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["digivolutionCards"],
          payCost: false,
          target: {
            filter: {
              zone: "digivolutionCards",
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
              hostFilter: { isSelfRef: true },
            },
            count: 1,
          },
        },
      ],
    });

    expect(card("BT1-045")?.effects).toEqual([]);
    expect(card("BT1-046")?.effects[0]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 4 },
        },
      ],
    });
    expect(card("BT1-047")?.effects).toEqual([]);

    expect(card("BT1-048")?.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 4,
          add: [{ filter: { kind: ["Tamer"], colors: ["Yellow"] }, count: "all", to: "hand" }],
          rest: "deckBottomAnyOrder",
        },
      ],
    });

    const labramon = card("BT1-049");
    expect(labramon?.effects[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          fireCondition: {
            kind: "allOf",
            conditions: [{ kind: "triggerDeletedByDpZero" }, { kind: "triggerIsFirstDeletedPermanent" }],
          },
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    });
    expect(card("BT1-050")?.effects).toEqual([]);
  });
});
