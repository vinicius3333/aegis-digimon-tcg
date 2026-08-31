import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST22-11 Defense Plug-In F", () => {
  it("de-digivolves two cards and returns itself to hand from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "ST22-11", as: "option" }, "BT1-090"] },
        1: { battleArea: [{ card: "BT1-020", as: "opponent", under: ["BT1-010", "BT1-015"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const option = s.inst("option").instanceId;
    await s.ready();
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponent").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === option));
    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === option)).toBe(true);
  });
});
