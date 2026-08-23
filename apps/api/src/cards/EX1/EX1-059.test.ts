import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-059.js";

describe("EX1-059 Ogremon", () => {
  it("may trash a card when attacking to gain Security Attack +1 for the turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-059", as: "ogremon" }], hand: [{ card: "BT1-009", as: "cost" }] },
        1: { security: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ogremon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("inherited may trash a card when attacking to give its host +2000 DP for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-060", as: "host", under: ["EX1-059"] }],
          hand: [{ card: "BT1-009", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 8000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
