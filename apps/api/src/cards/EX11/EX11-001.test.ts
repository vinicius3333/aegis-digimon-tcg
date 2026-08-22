import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-001.js";
import "../index.js";

describe("EX11-001 Koromon", () => {
  it("may digivolve its host into a Tyrannomon-named card when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-007", as: "host", under: ["EX11-001"] }],
          hand: [{ card: "EX11-009", as: "evolution" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX11-009"));
    const host = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "EX11-009");
    expect(host?.topCard?.cardId).toBe("EX11-009");
    expect(host?.stack.some((card) => card.cardId === "EX11-001")).toBe(true);
  });
});
