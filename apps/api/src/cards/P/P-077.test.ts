import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-011.js";
import "./P-077.js";

describe("P-077 Wizardmon", () => {
  it("gains 1 memory only when directly trashed from the deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-011", as: "attacker" }, "BT1-086"],
          deck: [{ card: "P-077", as: "wizardmon" }, "BT1-001", "BT1-002", "BT1-003"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("target").permanentId },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("wizardmon").instanceId));
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
  });

  it("places a revealed purple card from hand on top of the deck when inherited", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-081", as: "attacker", under: ["P-077"] }],
          hand: [{ card: "BT2-107", as: "purple" }, { card: "BT1-009", as: "red" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true, dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const purpleId = s.inst("purple").instanceId;
    const redId = s.inst("red").instanceId;

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("target").permanentId },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck[0]?.instanceId === purpleId);

    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(purpleId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === redId)).toBe(true);
  });
});
