import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./BT14-083.js";

describe("BT14-083", () => {
  const source = { instanceId: "source", cardId: "BT14-083", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers on-play trashing, opponent-source response, and security play", () => {
    expect(getEffectModule("BT14-083")!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(1);
    expect(getEffectModule("BT14-083")!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1);
    expect(getEffectModule("BT14-083")!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });
  it("trashes the top digivolution card of a chosen opposing Digimon on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT14-083", as: "joe" }] }, 1: { battleArea: [{ card: "BT14-058", as: "host", under: ["BT14-069"] }] } }, { autoSelectCards: true, autoAcceptOptional: true });
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("joe").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.length === 1);
    expect(s.perm("host").stack).toHaveLength(1);
    expect(s.perm("host").stack[0]!.cardId).toBe("BT14-069");
  });
});
