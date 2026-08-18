import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./BT2-039.js";

describe("BT2-039 Magnadramon", () => {
  it("recovers two cards when its owner has three or fewer security cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT2-039", as: "source" }], security: ["BT1-049"], deck: [
      { card: "BT1-050", as: "recoveryA" }, { card: "BT1-051", as: "recoveryB" },
      { card: "BT1-052", as: "notRecovered" },
    ] } });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.security.length === 3);
    expect(player.deck.map((card) => card.instanceId)).toEqual([s.inst("notRecovered").instanceId]);
    expect(player.security.slice(0, 2).map((card) => card.instanceId)).toEqual([
      s.inst("recoveryB").instanceId,
      s.inst("recoveryA").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("may play a yellow level 3 Digimon from hand without paying its cost when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-039", as: "magnadramon" }], hand: [{ card: "BT1-048", as: "played" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const instanceId = s.inst("played").instanceId;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("magnadramon"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
  });
});
