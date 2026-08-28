import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT2-061.js";
import "./BT2-062.js";
import "./BT2-063.js";
import "./BT2-064.js";
import "./BT2-065.js";
import "./BT2-066.js";
import "./BT2-067.js";
import "./BT2-068.js";
import "./BT2-069.js";
import "./BT2-070.js";

const card = (cardId: string) => runtimeCompiledCard(cardId);

describe("BT2-061 through BT2-070 IR coverage", () => {
  it("registers every card with complete executable coverage", () => {
    for (const cardId of [
      "BT2-061",
      "BT2-062",
      "BT2-063",
      "BT2-064",
      "BT2-065",
      "BT2-066",
      "BT2-067",
      "BT2-068",
      "BT2-069",
      "BT2-070",
    ]) {
      expect(card(cardId), `${cardId} must register compiled IR`).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("preserves printed triggers, gates, targets, keywords, and inherited clauses", () => {
    expect(card("BT2-061")?.effects).toEqual([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    ]);

    expect(card("BT2-062")?.effects).toMatchObject([
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "Replacement",
            event: "wouldDigivolve",
            mode: "reduceCost",
            amount: 1,
            into: { nameOrTrait: [{ tokens: ["Diaboromon"], match: "nameExact" }] },
          },
        ],
      },
    ]);

    expect(card("BT2-063")?.effects).toMatchObject([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }] },
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "Aura",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
            while: { kind: "selfHasKeyword", keyword: "Reboot" },
          },
        ],
      },
    ]);

    expect(card("BT2-064")?.effects).toEqual([]);

    expect(card("BT2-065")?.effects).toEqual([
      {
        trigger: "Static",
        actions: [],
        keywords: [
          { keyword: "Blocker", raw: "＜Blocker＞" },
          { keyword: "Reboot", raw: "＜Reboot＞" },
        ],
      },
    ]);

    expect(card("BT2-066")?.effects).toMatchObject([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "DeDigivolve",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 2 },
            amount: 2,
          },
        ],
      },
    ]);

    expect(card("BT2-067")?.effects).toEqual([]);

    expect(card("BT2-068")?.effects).toEqual([
      { trigger: "OnDeletion", actions: [{ kind: "TrashTopDeck", controller: "mine", amount: 3 }] },
    ]);

    expect(card("BT2-069")?.effects).toMatchObject([
      {
        trigger: "OnDeletion",
        isInherited: true,
        actions: [
          { kind: "Draw", controller: "mine", amount: 2 },
          { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
        ],
      },
    ]);

    expect(card("BT2-070")?.effects).toEqual([
      { trigger: "OnDeletion", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] },
    ]);
  });
});
