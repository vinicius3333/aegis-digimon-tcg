import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-045.js";

describe("BT5-045 LordKnightmon", () => {
  it("may play a yellow Warrior of any level when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-045", as: "lord" }], hand: [{ card: "BT5-045", as: "warrior" }] }, 1: { security: ["BT1-009"] } }, { autoSelectCards: true, autoAcceptOptional: true });
    const warriorId = s.inst("warrior").instanceId;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("lord").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === warriorId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === warriorId)).toBe(true);
  });

  it("may also play a yellow level 3 that is not a Warrior", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-045", as: "lord" }], hand: [{ card: "BT5-034", as: "rookie" }] }, 1: { security: ["BT1-009"] } }, { autoSelectCards: true, autoAcceptOptional: true });
    const rookieId = s.inst("rookie").instanceId;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("lord").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === rookieId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === rookieId)).toBe(true);
  });

  it("gets +1000 DP for each other own Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-045", as: "lord" }, "BT1-009", "BT1-010"] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("lord").currentDP).toBe(s.perm("lord").baseDP + 2000);
  });
});
