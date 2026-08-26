import { compiledEffects, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT22/BT22-032.js";
import { compiled } from "./BT11-035.js";

describe("BT11-035 ClearAgumon", () => {
  it("matches every catalog field and publishes an exact empty executable contract", () => {
    expect(getCardDefinition("BT11-035")).toMatchObject({
      cardId: "BT11-035",
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
      maxCountInDeck: 4,
    });
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
    expect(compiledEffects["BT11-035"]).toEqual(compiled);
  });

  it("evolves from a yellow level 2 for 0 and exposes the printed 4000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-003", as: "base" }],
        hand: [{ card: "BT11-035", as: "clear" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;

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
