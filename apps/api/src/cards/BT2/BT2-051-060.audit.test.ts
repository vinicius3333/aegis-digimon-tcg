import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT2-051.js";
import "./BT2-052.js";
import "./BT2-053.js";
import "./BT2-054.js";
import "./BT2-055.js";
import "./BT2-056.js";
import "./BT2-057.js";
import "./BT2-058.js";
import "./BT2-059.js";
import "./BT2-060.js";

const card = (cardId: string) => runtimeCompiledCard(cardId);

describe("BT2-051 through BT2-060 IR coverage", () => {
  it("registers every card with complete executable coverage", () => {
    for (const cardId of [
      "BT2-051",
      "BT2-052",
      "BT2-053",
      "BT2-054",
      "BT2-055",
      "BT2-056",
      "BT2-057",
      "BT2-058",
      "BT2-059",
      "BT2-060",
    ]) {
      expect(card(cardId), `${cardId} must register compiled IR`).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("preserves printed triggers, gates, targets, keywords, and inherited clauses", () => {
    expect(card("BT2-051")?.effects).toMatchObject([
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "GrantCanAttackUnsuspended",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            duration: "permanent",
            condition: {
              kind: "youHave",
              filter: { controllerDefault: "mine", kind: ["Tamer"], colors: ["Green"] },
            },
          },
        ],
      },
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenDeletesInBattle",
            sourceFilter: { isSelfRef: true },
            actions: [{ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }],
          },
        ],
      },
    ]);

    expect(card("BT2-052")?.effects).toEqual([]);

    expect(card("BT2-053")?.effects[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
            isSameName: true,
          },
          oncePerTiming: true,
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    });

    expect(card("BT2-054")?.effects).toMatchObject([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
      { trigger: "WhenAttacking", actions: [{ kind: "GainMemory", amount: -2 }] },
    ]);

    expect(card("BT2-055")?.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }],
    });

    expect(card("BT2-056")?.effects).toEqual([]);

    expect(card("BT2-057")?.effects[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "Jamming", raw: "＜Jamming＞" } },
          while: { kind: "selfHasKeyword", keyword: "Reboot" },
        },
      ],
    });

    expect(card("BT2-058")?.effects).toMatchObject([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "Restrict",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            restriction: "attack",
            duration: "permanent",
          },
        ],
      },
    ]);

    expect(card("BT2-059")?.effects[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
            nameMatchesInheritedHost: true,
          },
          oncePerTiming: true,
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });

    expect(card("BT2-060")?.effects).toEqual([]);
  });
});
