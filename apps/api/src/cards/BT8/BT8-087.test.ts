import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-087.js";

describe("BT8-087 T.K. Takaishi", () => {
  it("suspends and draws when the opponent attacks one of your blue Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-087", as: "tamer" },
          { card: "BT8-021", as: "blueDefender", suspended: true },
        ],
        deck: [{ card: "BT8-033", as: "drawn" }],
      },
      1: { battleArea: [{ card: "BT8-017", as: "attacker" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.turnSeat = 1;
    s.state.memory = 3;

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("blueDefender").permanentId },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("does not trigger when the attacked Digimon isn't blue", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-087", as: "tamer" },
          { card: "BT8-034", as: "yellowDefender", suspended: true },
        ],
        deck: [{ card: "BT8-033", as: "notDrawn" }],
      },
      1: { battleArea: [{ card: "BT8-017", as: "attacker" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.turnSeat = 1;
    s.state.memory = 3;

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("yellowDefender").permanentId },
    })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));

    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
