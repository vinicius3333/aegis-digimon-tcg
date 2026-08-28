import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-032.js";
import "./BT6-041.js";

describe("BT6-032 Tapirmon", () => {
  it("draws once when its host removes a card from your security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-041", under: ["BT6-032", "BT6-035"], as: "host" }],
          security: ["BT1-001"],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: { battleArea: ["BT6-016"], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});
