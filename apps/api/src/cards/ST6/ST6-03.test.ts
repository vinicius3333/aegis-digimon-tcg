import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST6-03.js";

describe("ST6-03 Gabumon", () => {
  it("draws 1 then trashes 1 from hand when its host attacks", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST6-04", as: "discard" }],
          deck: [{ card: "ST6-06", as: "drawn" }],
          battleArea: [{ card: "ST6-08", as: "host", under: ["ST6-03"] }],
        },
        1: { security: ["ST6-01"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
