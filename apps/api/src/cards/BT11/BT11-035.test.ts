import { compiledEffects, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT22/BT22-032.js";
import { compiled } from "./BT11-035.js";

describe("BT11-035 ClearAgumon", () => {
  it("matches every catalog field and publishes an exact empty executable contract", () => {
    expect(getCardDefinition("BT11-035")).toEqual({
      cardId: "BT11-035",
      set: "BT11",
      nameEn: "ClearAgumon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 4000,
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Puppet"],
      rarity: "C",
      maxCountInDeck: 4,
      imageId: "BT11-035",
      nameJp: "クリアアグモン",
    });
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
    expect(compiledEffects["BT11-035"]).toEqual(compiled);
  });

  it("retains BT11-003, evolves for 0, and draws exactly one card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-003", as: "base" }],
        hand: [{ card: "BT11-035", as: "clear" }],
        deck: [
          { card: "BT1-001", as: "drawA" },
          { card: "BT1-002", as: "drawB" },
        ],
      },
    });
    s.state.memory = 3;
    const baseInstanceId = s.inst("base").instanceId;
    const initialDeckInstanceIds = s.state.players[0]!.deck.map(({ instanceId }) => instanceId);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(2);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("clear").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-035");

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").currentDP).toBe(4000);
    expect(s.perm("base").stack).toHaveLength(1);
    expect(s.perm("base").stack[0]).toMatchObject({ cardId: "BT11-003", instanceId: baseInstanceId });
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(
      s.state.players[0]!.hand.filter(({ instanceId }) => initialDeckInstanceIds.includes(instanceId)),
    ).toHaveLength(1);
    expect(
      s.state.players[0]!.deck.filter(({ instanceId }) => initialDeckInstanceIds.includes(instanceId)),
    ).toHaveLength(1);
    expect(s.decisions).toHaveLength(0);
  });

  it("plays for 3 without opening any card-effect decisions", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT11-035", as: "clear" }] } });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("clear").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(2);
    expect(s.perm("clear").currentDP).toBe(4000);
    expect(s.decisions).toHaveLength(0);
  });

  it("is selected as a level-3 Puppet from a mixed hand by the shared Puppet peer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-032", as: "peer" }],
          hand: [
            { card: "BT11-035", as: "clear" },
            { card: "BT22-024", as: "nonPuppet" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnDeletion, s.perm("peer"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT11-035"));

    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("clear").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("nonPuppet").instanceId);
  });
});
