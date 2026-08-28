import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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
  it("registers the complete DigiXros and declarative replacement IR", async () => {
    const { runtimeCompiledCard } = await import("../../engine/effects/interpreter/compiledCards.js");
    const card = runtimeCompiledCard(BT12_112)!;
    expect(card.coverage).toBe("full");
    expect(card.residual).toEqual([]);
    expect(card.digiXrosRequirement).toEqual([
      { materials: [{ traits: ["Xros Heart", "Blue Flare"], differentCardNumbers: true }], count: "infinity" },
    ]);
    expect(card.effects.some((effect) => effect.trigger === "Static")).toBe(true);
    const yourTurn = card.effects.find((effect) => effect.trigger === "YourTurn");
    expect(yourTurn?.actions).toEqual([
      expect.objectContaining({
        kind: "DisableSecurityEffect",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        sourceKind: "option",
        scope: "seat",
        duration: "forTheTurn",
      }),
    ]);
  });

  it("registers the printed On Play, opponent-action, and turn security-lock effects", () => {
    const module = getEffectModule(BT12_112);
    const source = { instanceId: "source-112", cardId: BT12_112, ownerSeat: 0, isOnBattleArea: () => true } as never;
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1);
  });

  it("plays at cost 14 (15 - 1), placing the [Shoutmon] as a digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: SHOUTMON, dp: 3000, as: "shoutmon", under: [{ card: "BT1-009", as: "source-stack" }] },
          ],
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
    const sourceStackId = s.inst("source-stack").instanceId;
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
    // It now lives under BT12-112 as the only placed digivolution card; its own source stack was
    // trashed by the would-be-played effect before placement (KB Q2250).
    expect(played?.stack.map((c) => c.cardId)).toEqual([SHOUTMON]);
    expect(s.state.players[0]?.trash.map(({ instanceId }) => instanceId)).toContain(sourceStackId);
  });

  it("declining the optional cost plays at the full cost (15), with the [Shoutmon] untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: SHOUTMON, dp: 3000, as: "shoutmon", under: [{ card: "BT1-009", as: "source-stack" }] },
          ],
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
    const sourceStackId = s.inst("source-stack").instanceId;
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
    expect(s.perm("shoutmon").stack.map(({ instanceId }) => instanceId)).toEqual([sourceStackId]);
  });
});

it("suppresses opponent Option Security effects only for source-owner attackers", async () => {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: BT12_112, as: "x7" },
        { card: "BT1-009", as: "owner-attacker" },
      ],
    },
    1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
  });
  await s.ready();
  const security = observe(s.engine);
  expect(security.suppressesSecurityEffect(s.perm("owner-attacker"), "BT12-101")).toBe(true);
  expect(security.suppressesSecurityEffect(s.perm("attacker"), "BT12-101")).toBe(false);
});
