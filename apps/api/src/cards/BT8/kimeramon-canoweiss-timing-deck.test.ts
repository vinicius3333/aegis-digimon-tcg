import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-013.js";
import "./BT8-084.js";
import "../BT10/BT10-011.js";

describe("BT8 Kimeramon/Canoweissmon acquired-effect timing", () => {
  it("does not retroactively trigger BetelGammamon Blitz when Canoweissmon enters the stack mid-window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-013", as: "betel" }],
          hand: [{ card: "BT8-084", as: "kimeramon" }],
          trash: [{ card: "BT10-011", as: "canoweissmon" }],
          deck: ["BT1-001"],
        },
        1: { security: ["BT1-002", "BT1-003"], deck: ["BT1-004"] },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.isFirstPlayersFirstTurn = true;
    s.state.memory = 3;

    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("betel").permanentId,
        instanceId: s.inst("kimeramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("betel").topCard.cardId === "BT8-084" &&
        s.perm("betel").stack.some(({ instanceId }) => instanceId === s.inst("canoweissmon").instanceId) &&
        s.state.pendingDecision === undefined,
    );

    // Q1940: Canoweissmon's inherited grant is acquired only after this When Digivolving
    // window began. BetelGammamon's Blitz trigger has already missed its trigger point.
    expect(s.engine.hasAcceptedBlitzAttack(s.perm("betel").permanentId)).toBe(false);
    await settle(() => !mainPhase.isOpen);
    expect(mainPhase.isOpen).toBe(false);
    await turn;
    expect(s.state.players[1]!.security).toHaveLength(2);
    assertNoLoudGap(s);
  });
});
