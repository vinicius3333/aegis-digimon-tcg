import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { irNode } from "../../engine/testkit/irNode.js";
import "./BT1-021.js";
import "./BT1-022.js";
import "./BT1-023.js";
import "./BT1-024.js";
import "./BT1-025.js";
import "./BT1-026.js";
import "./BT1-027.js";
import "./BT1-028.js";
import "./BT1-029.js";
import "./BT1-030.js";

const card = (cardId: string) => runtimeCompiledCard(cardId);

describe("BT1-021 through BT1-030 IR coverage", () => {
  it("registers every card with complete executable coverage", () => {
    for (const cardId of [
      "BT1-021",
      "BT1-022",
      "BT1-023",
      "BT1-024",
      "BT1-025",
      "BT1-026",
      "BT1-027",
      "BT1-028",
      "BT1-029",
      "BT1-030",
    ]) {
      expect(card(cardId), `${cardId} must register compiled IR`).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("preserves every printed trigger, keyword, target, boundary, and inherited clause", () => {
    expect(card("BT1-021")?.effects[0]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        { kind: "GainMemory", amount: 3 },
        { kind: "GainMemory", amount: -3, at: "endOfTurn" },
      ],
    });

    const garudamon = card("BT1-022");
    expect(garudamon?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Piercing" }] },
      { trigger: "WhenBlocked", isInherited: true, condition: { kind: "isYourTurn" } },
    ]);

    expect(irNode(card("BT1-023")?.effects[0]?.actions[0])?.target.filter.keywords).toContain("Blocker");
    expect(card("BT1-024")?.effects).toEqual([]);

    const warGreymon = card("BT1-025");
    expect(warGreymon?.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, duration: "forTheTurn" }],
    });
    expect(warGreymon?.effects[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "DisableSecurityEffect",
          sourceKind: "option",
          duration: "forTheTurn",
        },
      ],
    });

    expect(card("BT1-026")?.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }],
    });
    expect(card("BT1-027")?.effects).toEqual([]);
    expect(card("BT1-028")?.effects).toEqual([]);
    expect(card("BT1-029")?.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
    });
    expect(card("BT1-030")?.effects[0]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
  });
});
