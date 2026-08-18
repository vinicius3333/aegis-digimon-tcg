import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-049.js";

describe("EX1-049 MetalTyrannomon", () => {
  it("adds a level 6 Machine and trashes the other revealed cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-047", as: "base" }], hand: [{ card: "EX1-049", as: "evo" }], deck: ["BT11-072", "BT1-009", "BT1-010"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evo").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT11-072"));
    await settle(() => s.state.players[0]!.trash.length === 2);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("grants inherited Reboot and unsuspends a Machine host on the opponent's unsuspend phase", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-042", as: "host", suspended: true, under: ["EX1-049"] }] } });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    await (
      s.engine as unknown as { unsuspendForActivePhase(seat: 0 | 1): Promise<string[]> }
    ).unsuspendForActivePhase(1);
    expect(s.perm("host").isSuspended).toBe(false);
  });
});
