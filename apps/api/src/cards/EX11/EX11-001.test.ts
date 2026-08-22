import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-001.js";
import "../index.js";

describe("EX11-001 Koromon", () => {
  it("may digivolve its host into a Tyrannomon-named card when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-001", as: "host", under: ["EX11-001"] }],
          hand: [{ card: "EX11-009", as: "evolution" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
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

    await settle(() => s.perm("host").topCard?.cardId === "EX11-009");
    expect(s.perm("host").topCard?.cardId).toBe("EX11-009");
    expect(s.perm("host").stack.some((card) => card.cardId === "EX11-001")).toBe(true);
  });
});
