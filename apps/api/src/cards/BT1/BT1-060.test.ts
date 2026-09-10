import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-060.js";

async function evolveThroughMagnaAngemon(s: EngineSetup) {
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("magnaAngemon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard.instanceId === s.inst("magnaAngemon").instanceId);
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("slashAngemon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard.instanceId === s.inst("slashAngemon").instanceId);
}

describe("BT1-060 MagnaAngemon", () => {
  it("matches the catalog and exact Recovery/inherited IR contract", () => {
    expect(getCardDefinition("BT1-060")).toMatchObject({
      cardId: "BT1-060",
      set: "BT1",
      nameEn: "MagnaAngemon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 6000,
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Archangel"],
      effectText:
        "[On Play] Trigger ＜Recovery +1 (Deck)＞. (Place the top card of your deck on top of your security stack.)",
      inheritedEffectText: "[Your Turn] This Digimon gets +1000 DP for every 3 security cards you have.",
      rarity: "SR",
      maxCountInDeck: 4,
      imageId: "BT1-060",
      nameJp: "ホーリーエンジェモン",
    });
    expect(getCardDefinition("BT1-060")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({
      effects: [
        { trigger: "OnPlay", actions: [{ kind: "Recover", amount: 1 }] },
        {
          trigger: "YourTurn",
          isInherited: true,
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              amount: 1000,
              duration: "forTheTurn",
              scaling: { per: 3, unit: "security", filter: { controller: "mine" } },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("recovers the top main-deck card on play", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT1-060", as: "magnaAngemon" }],
        deck: [
          { card: "BT1-049", as: "recovered" },
          { card: "BT1-051", as: "leftInDeck" },
        ],
        security: [{ card: "BT1-050", as: "existing" }],
      },
    });
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magnaAngemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovered").instanceId));
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security[0]?.instanceId).toBe(s.inst("recovered").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("leftInDeck").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    { security: ["BT1-049", "BT1-049"], bonus: 0 },
    { security: ["BT1-049", "BT1-049", "BT1-049", "BT1-049", "BT1-049"], bonus: 1000 },
    { security: ["BT1-049", "BT1-049", "BT1-049", "BT1-049", "BT1-049", "BT1-049"], bonus: 2000 },
  ])("applies +$bonus for complete groups of 3 security cards", async ({ security, bonus }) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-056", as: "base" }],
        hand: [
          { card: "BT1-060", as: "magnaAngemon" },
          { card: "BT1-062", as: "slashAngemon" },
        ],
        deck: [
          { card: "BT1-010", as: "draw1" },
          { card: "BT1-011", as: "draw2" },
        ],
        security,
      },
    });
    s.state.memory = 6;
    await evolveThroughMagnaAngemon(s);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-056", "BT1-060"]);
    expect(s.perm("base").currentDP).toBe(8000 + bonus);
  });

  it("does not apply the inherited bonus during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-056", as: "base" }],
        hand: [
          { card: "BT1-060", as: "magnaAngemon" },
          { card: "BT1-062", as: "slashAngemon" },
        ],
        deck: [
          { card: "BT1-010", as: "draw1" },
          { card: "BT1-011", as: "draw2" },
        ],
        security: ["BT1-049", "BT1-049", "BT1-049", "BT1-049", "BT1-049", "BT1-049"],
      },
    });
    s.state.memory = 6;
    await evolveThroughMagnaAngemon(s);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("base").currentDP).toBe(8000);
  });

  it("does not recover when MagnaAngemon is digivolved", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-056", as: "base" }],
        hand: [{ card: "BT1-060", as: "magnaAngemon" }],
        deck: [
          { card: "BT1-010", as: "evolutionDraw" },
          { card: "BT1-049", as: "mustStayInDeck" },
        ],
        security: [{ card: "BT1-050", as: "existing" }],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magnaAngemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("magnaAngemon").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("existing").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("mustStayInDeck").instanceId);
  });

  it("rejects evolution from a red level 4", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-014", as: "redBase" }], hand: [{ card: "BT1-060", as: "magnaAngemon" }] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("magnaAngemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
