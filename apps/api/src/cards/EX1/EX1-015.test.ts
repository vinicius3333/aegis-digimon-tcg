import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-015.js";

describe("EX1-015 Garurumon", () => {
  it("plays a Matt Ishida costing 3 or less for free on attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-017", as: "attacker", under: ["EX1-015"] }],
          hand: [{ card: "ST2-12", as: "matt" }],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const mattId = s.inst("matt").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === mattId));
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not play a different combined-name Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-017", as: "attacker", under: ["EX1-015"] }],
          hand: [{ card: "AD1-019", as: "combined" }],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const combinedId = s.inst("combined").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === combinedId)).toBe(true);
  });
});
