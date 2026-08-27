import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { irNode } from "../../engine/testkit/irNode.js";
import "./BT2-021.js";
import "./BT2-022.js";
import "./BT2-023.js";
import "./BT2-024.js";
import "./BT2-025.js";
import "./BT2-026.js";
import "./BT2-027.js";
import "./BT2-028.js";
import "./BT2-029.js";
import "./BT2-030.js";

const card = (cardId: string) => runtimeCompiledCard(cardId);

describe("BT2-021 through BT2-030 IR coverage", () => {
  it("registers every card with complete executable coverage", () => {
    for (const cardId of [
      "BT2-021",
      "BT2-022",
      "BT2-023",
      "BT2-024",
      "BT2-025",
      "BT2-026",
      "BT2-027",
      "BT2-028",
      "BT2-029",
      "BT2-030",
    ]) {
      expect(card(cardId), `${cardId} must register compiled IR`).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("preserves printed triggers, boundaries, targets, keywords, and inherited clauses", () => {
    expect(card("BT2-021")?.effects[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenUnsuspended",
          sourceFilter: { isSelfRef: true },
          fireCondition: { kind: "phaseIs", phase: "Main" },
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    });

    expect(card("BT2-022")?.effects).toEqual([]);

    expect(irNode(card("BT2-023")?.effects[0]?.actions[0])).toMatchObject({
      kind: "CostModifier",
      mode: "reduce",
      costType: "play",
      amount: 1,
      handResident: true,
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      scaling: {
        per: 1,
        unit: "cards",
        filter: {
          zone: "battleArea",
          controller: "opponent",
          kind: ["Digimon"],
          digivolutionCards: "none",
        },
      },
    });

    expect(card("BT2-024")?.effects).toEqual([]);

    expect(card("BT2-025")?.effects[0]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [
        {
          kind: "TrashDigivolution",
          amount: 1,
          fromTop: true,
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" },
            count: 1,
          },
        },
      ],
    });

    expect(card("BT2-026")?.effects[0]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "Jamming", raw: "＜Jamming＞" } },
          while: {
            kind: "youHave",
            filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"], colors: ["Blue"] },
          },
        },
      ],
    });

    expect(card("BT2-027")?.effects).toEqual([]);

    expect(card("BT2-028")?.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Unsuspend",
          target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Blue"] }, count: 1 },
          condition: {
            kind: "youHave",
            filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"], colors: ["Blue"] },
          },
        },
      ],
    });
    expect(card("BT2-028")?.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenUnsuspended",
          sourceFilter: { isSelfRef: true },
          fireCondition: { kind: "phaseIs", phase: "Main" },
          actions: [
            {
              kind: "GainKeyword",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              keyword: { keyword: "Jamming", raw: "＜Jamming＞" },
              duration: "forTheTurn",
            },
          ],
        },
      ],
    });

    expect(card("BT2-029")?.effects[0]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "Restrict",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          restriction: "cantBeBlockedByNoDigivolution",
          duration: "permanent",
        },
      ],
    });

    expect(card("BT2-030")?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "Return",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
              count: 2,
              upTo: true,
            },
            to: "hand",
          },
        ],
      },
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "Restrict",
            restriction: "cantBeBlockedByNoDigivolution",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            duration: "permanent",
          },
        ],
      },
    ]);
  });
});
