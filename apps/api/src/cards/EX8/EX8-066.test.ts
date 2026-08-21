import { describe, expect, it } from "vitest";
import { EffectTiming, PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX8-066.js";

describe("EX8-066", () => {
  const source = {
    instanceId: "source",
    cardId: "EX8-066",
    ownerSeat: 0,
    definition: {},
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  } as never;
  it("registers the printed start-main memory gain", () => {
    const module = getEffectModule("EX8-066")!;
    expect(module.effectsForTiming(EffectTiming.OnStartMainPhase, source)).toHaveLength(1);
  });
  it("registers the All Turns Ice-Snow play and digivolve watcher", () => {
    const module = getEffectModule("EX8-066")!;
    expect(module.effectsForTiming(EffectTiming.None, source)).toHaveLength(1);
  });
  it("registers the printed security play effect", () => {
    const module = getEffectModule("EX8-066")!;
    expect(module.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });
  it("plays the exact security Tamer into the battle area without cost", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-010", as: "attacker" }] }, 1: { security: [{ card: "EX8-066", as: "securityCard" }] } });
    const instanceId = s.inst("securityCard").instanceId;
    const memoryBeforeSecurityEffect = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => (s.state.players[1] as PlayerState).battleArea.some((permanent) => permanent.topCard.cardId === "EX8-066"));
    expect((s.state.players[1] as PlayerState).battleArea.some((permanent) => permanent.topCard.instanceId === instanceId)).toBe(true);
    expect((s.state.players[1] as PlayerState).security.some((card) => card.instanceId === instanceId)).toBe(false);
    expect(s.state.memory).toBe(memoryBeforeSecurityEffect);
  });
});
