import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../ST2/ST2-13.js";
import "./ST4-11.js";

describe("ST4-11 MegaKabuterimon", () => {
  it("trashes the opponent's top security when its host wins a battle", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST4-13", under: ["ST4-11"], as: "host" }] }, 1: { battleArea: [{ card: "ST4-03", as: "victim", suspended: true }], security: [{ card: "ST2-13", as: "security" }] } });
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "permanent", permanentId: s.perm("victim").permanentId } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.trash.some((c) => c.instanceId === s.inst("security").instanceId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("does not win the game when its effect finds an empty security stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST4-13", under: ["ST4-11"], as: "host" }] },
      1: { battleArea: [{ card: "ST4-03", as: "victim", suspended: true }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.gameOver).toBe(false);
  });
});
