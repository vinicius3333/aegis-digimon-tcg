import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-030.js";
import "./BT1-026.js";
import "../ST2/ST2-07.js";

describe("BT1-030 Gomamon", () => {
  it("gains 1 memory when its Digimon is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-032", as: "host", dp: 1000, suspended: true, under: ["BT1-030"] }] },
      1: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 20000 }] },
    });
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.memory === -1);
    expect(s.state.memory).toBe(-1);
  });

  it("still completes Piercing before the memory-crossed turn ends", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST2-07", as: "blocker", dp: 1000, under: ["BT1-030"] }],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-026", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[0]!.security.length === 0);

    expect(s.state.memory).toBe(-1);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
