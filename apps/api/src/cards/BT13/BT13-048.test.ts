import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-048.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-048 Salamon", () => {
  it("searches the two printed trait groups and applies the inherited DP condition", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottomAnyOrder",
          add: [
            {
              count: 1,
              to: "hand",
              filter: {
                kind: ["Digimon"],
                excludeNameOrTrait: [{ match: "traitContains", tokens: ["Sea Animal"] }],
                nameOrTrait: [
                  { match: "traitContains", tokens: ["Beast", "Animal"] },
                  { match: "traitContains", tokens: ["Sovereign"] },
                ],
              },
            },
            {
              count: 1,
              to: "hand",
              filter: { kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["Royal Knight"] }] },
            },
          ],
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "modifyDP", amount: 2000 },
          while: { kind: "anyOf" },
        },
      ],
    });
  });

  it("publicly adds one Beastkin and one Royal Knight while bottoming an excluded Sea Animal", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-048", as: "salamon" }],
          deck: [
            { card: "BT13-052", as: "beast" },
            { card: "BT13-046", as: "royal-knight" },
            { card: "BT1-033", as: "sea-animal" },
            { card: "BT1-009", as: "remainder" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("salamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("beast").instanceId, s.inst("royal-knight").instanceId].sort(),
    );
    expect(s.state.players[0]!.deck.at(-1)!.instanceId).toBe(s.inst("sea-animal").instanceId);
  });

  it("gives an inherited Beast or Royal Knight host +2000 only on its controller's turn", async () => {
    for (const [host, baseDP] of [
      ["BT13-052", 5000],
      ["BT13-046", 13000],
    ] as const) {
      const s = setupEngine({ 0: { battleArea: [{ card: host, as: "host", under: ["BT13-048"] }] } });
      await s.ready();
      expect(s.perm("host").currentDP).toBe(baseDP + 2000);
      s.state.turnSeat = 1;
      await s.engine.recomputeContinuousEffects();
      expect(s.perm("host").currentDP).toBe(baseDP);
    }
  });

  it("does not boost a Sea Animal or unrelated host", async () => {
    for (const [host, baseDP] of [
      ["BT1-033", 4000],
      ["BT1-071", 6000],
    ] as const) {
      const s = setupEngine({ 0: { battleArea: [{ card: host, as: "host", under: ["BT13-048"] }] } });
      await s.ready();
      expect(s.perm("host").currentDP).toBe(baseDP);
    }
  });

  it("digivolves from a green level 2 for zero memory", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT13-004", as: "base" }, hand: [{ card: "BT13-048", as: "salamon" }] },
    });
    s.state.memory = 1;
    const baseId = s.inst("base").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("salamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-048");
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
  });
});
