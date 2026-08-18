import { describe, expect, it } from "vitest";
import { Phase, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-026.js";

describe("BT7-026 WereGarurumon", () => {
  it("gains 2 memory on play when its owner already has a Tamer", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT7-086", as: "tamer" }],
      hand: [{ card: "BT7-026", as: "source" }],
    } });
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 2);

    expect(s.state.memory).toBe(2);
  });

  it("gains memory only when its host unsuspends during the main phase", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT7-028", under: ["BT7-026"], as: "host", suspended: true }] } });
    s.state.memory = 0;
    s.state.phase = Phase.Draw;
    await s.ready();

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.state.memory).toBe(0);

    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    s.state.phase = Phase.Main;
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.state.memory).toBe(1);
  });

  it("plays a blue Tamer for free when its owner has no Tamer in play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT7-026", as: "source" }, { card: "BT7-086", as: "tamer" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.battleArea.some((p) => p.topCard?.instanceId === s.inst("tamer").instanceId));
    expect(s.state.memory).toBe(0);
  });
});
