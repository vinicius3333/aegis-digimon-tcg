import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-029.js";

describe("BT9-029 Suijinmon", () => {
  it("matches catalog and full three-clause IR, including Q1828's hand-main timing", () => {
    expect(getCardDefinition("BT9-029")).toMatchObject({
      cardId: "BT9-029", nameEn: "Suijinmon", colors: ["Blue", "Black"], kinds: ["Digimon"], level: 6,
      playCost: 11, dp: 11000,
      evoCosts: [{ color: "Blue", level: 5, memoryCost: 3 }, { color: "Black", level: 5, memoryCost: 3 }],
      forms: ["Mega"], attributes: ["Data"], types: ["Machine"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [],
      effects: [
        { trigger: "Main", isFromHand: true, actions: [{ kind: "PlaceUnder", optional: true, cost: { kind: "payMemory", memory: 1 }, underFilter: { nameOrTrait: [{ tokens: ["Justimon", "Raidenmon"], match: "name" }] } }] },
        { trigger: "WhenDigivolving", actions: [{ kind: "Return", to: "deckBottom", optional: true, cost: { kind: "trash", target: { filter: { zone: "hand", kind: ["Digimon"] }, count: 1 } } }] },
        { trigger: "WhenAttacking", isInherited: true, actions: [{ kind: "Return", to: "hand", target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 4 } } } }] },
      ],
    });
  });

  it("trashes a Machine or Cyborg to bottom-deck a level 4 Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-060", as: "base" }],
          hand: [
            { card: "BT9-029", as: "evolving" },
            { card: "BT1-021", as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "BT1-015", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const targetId = s.perm("target").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.some((card) => card.instanceId === targetId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
