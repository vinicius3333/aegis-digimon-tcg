import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-024.js";

describe("LM-024 Shivamon", () => {
  it("at 3 security suspends and returns the opposing Digimon while buffing Shivamon", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "LM-024", as: "shivamon" }], security: ["BT1-001", "BT1-002", "BT1-003"] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shivamon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "LM-024")!.currentDP).toBe(14000);
  });

  it("at 2 security returns an already-suspended opposing Digimon and does not buff", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "LM-024", as: "shivamon" }], security: ["BT1-001", "BT1-002"] },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shivamon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "LM-024")!.currentDP).toBe(11000);
  });
});
