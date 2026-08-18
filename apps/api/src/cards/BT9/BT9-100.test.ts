import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-100.js";

describe("BT9-100 Grandis Scissor", () => {
  it("suspends an opponent, unsuspends an Insectoid, and makes it attack that Digimon rather than the player", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-055", as: "insectoid", suspended: true }], hand: [{ card: "BT9-100", as: "option" }] },
      1: { battleArea: [{ card: "BT1-010", as: "target" }], security: ["BT1-011"] },
    }, { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true });
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 || s.state.players[1]!.security.length === 0);

    expect(s.perm("insectoid").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
