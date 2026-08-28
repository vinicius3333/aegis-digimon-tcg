import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-007.js";
import "./P-008.js";
import "./P-009.js";
import "./P-010.js";

describe("Greymon and Garurumon promo decks", () => {
  it("combines their exact-name sources, inherited boosts, draw, and unsuspend", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-010", as: "greymon", under: ["P-009"] },
          { card: "P-008", as: "wereGarurumon", under: ["P-007"] },
          { card: "BT1-044", as: "metalGarurumon", under: ["P-008"] },
        ],
        hand: Array.from({ length: 8 }, () => "BT1-001"),
        deck: [{ card: "BT1-002", as: "drawn" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    });
    const greymonBase = s.perm("greymon").baseDP;
    const drawnId = s.inst("drawn").instanceId;
    await s.ready();

    expect(s.perm("greymon").currentDP).toBe(greymonBase + 2000);
    expect(observe(s.engine).keywordAmount(s.perm("greymon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("metalGarurumon"), "SecurityAttack")).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("wereGarurumon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.perm("wereGarurumon").isSuspended && s.state.players[0]!.hand.some((card) => card.instanceId === drawnId),
    );

    expect(s.perm("wereGarurumon").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
  });
});
