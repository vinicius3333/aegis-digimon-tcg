import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT12-112 (Shoutmon X7: Superior Mode) — self ＜would be played＞ cost reduction paid by
// PLACING A PERMANENT (not a structured Cost), the family this fix unlocks:
//   "When you would play this card from your hand, by placing 1 of your [Shoutmon] as a
//   digivolution card under this Digimon, reduce its play cost by 1." (KB Q2249-Q2256)
//
// Before the fix, `wouldBePlayed reduceCost` replacements whose cost is paid by running an
// `actions` body (SelectBind + TrashDigivolution + PlaceUnder) were compiled but never consumed:
// `ReplacementSubscription.apply` had zero call sites, and this self-reducer shape wasn't in the
// old structured-Cost-only extraction. The fix generalizes the self-reducer extraction/consume path
// to run these actions bodies at pay-time, deferring the final relocation (the played permanent
// doesn't exist yet at pay-time) via `pendingSelfReducerRelocations`.
//
// FAILS-WHEN-REVERTED: without the fix, `wouldBePlayedSelfReducersFor` never captures an
// actions-body reducer, so the optional prompt is never offered, the [Shoutmon] is never placed,
// and the FULL cost (15) is paid.

const BT12_112 = "BT12-112"; // cost 15
const SHOUTMON = "BT12-008"; // Lv.3 Shoutmon, a valid material for the SelectBind filter

describe("BT12-112 ＜when played＞ cost reduction (place 1 [Shoutmon] → -1)", () => {
  it("plays at cost 14 (15 - 1), placing the [Shoutmon] as a digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: SHOUTMON, dp: 3000, as: "shoutmon" }],
          hand: [{ card: BT12_112, as: "card" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0];
    s.state.memory = 14; // exactly the reduced cost

    const res = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId });
    expect(res).toEqual({ ok: true });

    const shoutmonPermanentId = s.perm("shoutmon").permanentId;
    await settle(
      () => (p0?.battleArea.some((p) => p.topCard?.cardId === BT12_112) ?? false) && s.state.memory === 0,
      400,
    );

    const played = p0?.battleArea.find((p) => p.topCard?.cardId === BT12_112);
    expect(played).toBeDefined();
    // The full cost (15) was NOT paid — memory 14 reduced cost paid to 0, not -1.
    expect(s.state.memory).toBe(0);
    // The [Shoutmon] permanent is gone from the top-level battle area (relocated as a digivolution
    // card) — the actions body actually ran, not just the amount.
    expect(p0?.battleArea.some((p) => p.permanentId === shoutmonPermanentId)).toBe(false);
    // It now lives under BT12-112 as a digivolution card.
    expect(played?.stack.some((c) => c.cardId === SHOUTMON)).toBe(true);
  });

  it("declining the optional cost plays at the full cost (15), with the [Shoutmon] untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: SHOUTMON, dp: 3000, as: "shoutmon" }],
          hand: [{ card: BT12_112, as: "card" }],
        },
      },
      { autoSelectCards: true },
    );
    const p0 = s.state.players[0];
    s.state.memory = 15; // the FULL cost, not the reduced one

    const res = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId });
    expect(res).toEqual({ ok: true });

    const shoutmonPermanentId = s.perm("shoutmon").permanentId;
    // The harness's `autoAcceptOptional` only ever answers "yes" — declining requires
    // responding to the captured decision by hand.
    await settle(() => s.decisions.some((d) => d.req.kind === "optional"), 400);
    const prompt = s.decisions.find((d) => d.req.kind === "optional");
    if (prompt !== undefined) {
      s.engine.applyIntent(prompt.seat, {
        type: "respondDecision",
        decisionId: prompt.req.decisionId,
        response: { kind: "optional", accept: false },
      });
    }
    await settle(
      () => (p0?.battleArea.some((p) => p.topCard?.cardId === BT12_112) ?? false) && s.state.memory === 0,
      400,
    );

    const played = p0?.battleArea.find((p) => p.topCard?.cardId === BT12_112);
    expect(played).toBeDefined();
    expect(s.state.memory).toBe(0);
    // No discount was granted and the [Shoutmon] was left as its own permanent, untouched.
    expect(p0?.battleArea.some((p) => p.permanentId === shoutmonPermanentId)).toBe(true);
    expect(played?.stack.length ?? 0).toBe(0);
  });
});
