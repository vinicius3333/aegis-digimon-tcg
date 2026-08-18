import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-043.js";

// A3 for BT8-043 (Cherubimon) — self ＜would be played＞ cost reduction paid by DELETING a
// permanent (an "actions" cost body, the family this fix unlocks alongside BT12-112):
//   "When you would play this card from your hand, you may delete 1 of your purple [Cherubimon]
//   to reduce this card's play cost by 8."
//
// Before the fix, the reduceCost Replacement compiled fine but was never consumed: the reducer's
// cost is expressed as a nested optional `Delete` action, not a structured `Cost` object, so it
// fell outside the old structured-cost-only self-reducer extraction. The fix generalizes capture +
// consume to run this "actions" cost body (with its own nested `optional` stripped — the reducer-
// level "you may" prompt is the single choice point) at pay-time.
//
// FAILS-WHEN-REVERTED: without the fix, the optional prompt is never offered, no [Cherubimon] is
// deleted, and the FULL cost (11) is paid.

const BT8_043 = "BT8-043"; // cost 11
const PURPLE_CHERUBIMON = "BT7-079"; // a purple [Cherubimon], the required deletion target

describe("BT8-043 ＜when played＞ cost reduction (delete 1 purple [Cherubimon] → -8)", () => {
  it("plays at cost 3 (11 - 8), deleting the purple [Cherubimon]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: PURPLE_CHERUBIMON, dp: 3000, as: "cherub" }],
          hand: [{ card: BT8_043, as: "card" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const cherub = s.perm("cherub");
    s.state.memory = 3; // exactly the reduced cost

    const card = s.inst("card");
    const res = s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId });
    expect(res).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === BT8_043) && s.state.memory === 0, 400);

    expect(p0.battleArea.some((p) => p.topCard?.cardId === BT8_043)).toBe(true);
    // The full cost (11) was NOT paid — memory 3 reduced cost paid to 0, not -8.
    expect(s.state.memory).toBe(0);
    // The purple [Cherubimon] was actually deleted (the actions body ran, not just the amount).
    expect(p0.battleArea.some((p) => p.permanentId === cherub.permanentId)).toBe(false);
  });

  it("declining the optional cost plays at the full cost (11), with the [Cherubimon] untouched", async () => {
    // No autoAcceptOptional: the harness only auto-ANSWERS "yes" when true, it has no
    // auto-decline mode, so this test answers the optional prompt by hand.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: PURPLE_CHERUBIMON, dp: 3000, as: "cherub" }],
          hand: [{ card: BT8_043, as: "card" }],
        },
      },
      { autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const cherub = s.perm("cherub");
    s.state.memory = 11; // the FULL cost, not the reduced one

    const card = s.inst("card");
    const res = s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId });
    expect(res).toEqual({ ok: true });

    await settle(() => s.decisions.some((d) => d.req.kind === "optional"));
    const optionalReq = s.decisions.find((d) => d.req.kind === "optional")!;
    s.engine.applyIntent(optionalReq.seat, {
      type: "respondDecision",
      decisionId: optionalReq.req.decisionId,
      response: { kind: "optional", accept: false },
    });

    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === BT8_043) && s.state.memory === 0, 400);

    expect(p0.battleArea.some((p) => p.topCard?.cardId === BT8_043)).toBe(true);
    expect(s.state.memory).toBe(0);
    // No discount was granted and the [Cherubimon] was left untouched.
    expect(p0.battleArea.some((p) => p.permanentId === cherub.permanentId)).toBe(true);
  });
});
