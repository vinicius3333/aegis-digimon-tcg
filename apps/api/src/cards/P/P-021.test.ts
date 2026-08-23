import { describe, it, expect } from "vitest";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./P-021.js";

// A3 for P-021 (A New World) — Mimi Tachikawa + Palmon play effect:
//   "[Main] If you have a [Mimi Tachikawa] in play, you may play a [Palmon] from your hand
//    without paying its memory cost. If you played one, return 1 of your [Mimi Tachikawa]
//    to its owner's hand."
//
// FAILS-WHEN-REVERTED: without the P-021 module, playing the option does nothing —
//   the Palmon does not appear in the battle area, and Mimi is not bounced.

const P_021 = "P-021";
const PALMON = "BT1-067"; // Palmon, Lv3, cost 3 (plays free via effect)
const MIMI = "BT1-089"; // Mimi Tachikawa, Tamer

function playersOf(s: EngineSetup) {
  return { p0: s.state.players[0]!, p1: s.state.players[1]! };
}

describe("P-021 A New World — play Palmon free + bounce Mimi", () => {
  it("plays a Palmon free from hand and bounces Mimi to hand when Mimi is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: MIMI, as: "mimiPerm", dp: 0 }],
          hand: [
            { card: PALMON, as: "palmon" },
            { card: P_021, as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const { p0 } = playersOf(s);
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });

    // After settling, Palmon should be in the battle area (played free).
    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === PALMON));
    expect(p0.battleArea.some((perm) => perm.topCard?.cardId === PALMON)).toBe(true);

    // Mimi Tachikawa should have been bounced back to hand.
    await settle(() => p0.hand.some((c) => c.cardId === MIMI), 400);
    expect(p0.hand.some((c) => c.cardId === MIMI)).toBe(true);

    // Mimi is no longer in the battle area.
    expect(p0.battleArea.some((perm) => perm.topCard?.cardId === MIMI)).toBe(false);
  });

  it("can be used with a green source but does nothing when no exact Mimi is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-068"],
          hand: [
            { card: P_021, as: "option" },
            { card: PALMON, as: "palmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const { p0 } = playersOf(s);
    s.state.memory = 3;

    // The effect has canActivate gated on Mimi being in play. Without Mimi the card
    // can still be played (cost 0), but the effect does nothing (effect returns early).
    // This is an observable: no Palmon enters the battle area.
    const palmon = s.inst("palmon");

    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => p0.trash.some((card) => card.instanceId === optionId));

    // Palmon should remain in hand — the effect gated on Mimi did not play it.
    expect(p0.battleArea.some((perm) => perm.topCard?.cardId === PALMON)).toBe(false);
    expect(p0.hand.some((c) => c.instanceId === palmon.instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not treat a combined Tamer whose name contains Mimi Tachikawa as exact Mimi", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT5-089"],
          hand: [
            { card: P_021, as: "option" },
            { card: PALMON, as: "palmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    const palmonId = s.inst("palmon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === palmonId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === PALMON)).toBe(false);
    assertNoLoudGap(s);
  });

  it("keeps the same printed clause through Palmon and exact-Mimi selections", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-089", as: "firstMimi" },
            { card: "BT3-096", as: "secondMimi" },
          ],
          hand: [
            { card: "BT1-067", as: "firstPalmon" },
            { card: "BT5-047", as: "secondPalmon" },
            { card: P_021, as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    const firstMimi = s.perm("firstMimi");
    const secondMimi = s.perm("secondMimi");
    const firstPalmonId = s.inst("firstPalmon").instanceId;
    const secondPalmonId = s.inst("secondPalmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const palmonRequest = s.decisions.at(-1)!.req;
    expect(palmonRequest.sourceCardId).toBe(P_021);
    expect(palmonRequest.options?.timing).toBe("Main");
    expect(palmonRequest.options?.effectText).toContain("[Main] If you have [Mimi Tachikawa]");
    expect(palmonRequest.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([firstPalmonId, secondPalmonId]),
    );

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: palmonRequest.decisionId,
        response: { kind: "selectCards", instanceIds: [secondPalmonId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const mimiRequest = s.decisions.at(-1)!.req;
    expect(mimiRequest.sourceCardId).toBe(P_021);
    expect(mimiRequest.options?.timing).toBe("Main");
    expect(mimiRequest.options?.effectText).toBe(palmonRequest.options?.effectText);
    expect(mimiRequest.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([firstMimi.permanentId, secondMimi.permanentId]),
    );

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: mimiRequest.decisionId,
        response: { kind: "chooseTargets", instanceIds: [secondMimi.permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT3-096"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === secondPalmonId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === firstPalmonId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === firstMimi.permanentId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });
});

describe("P-021 [Security]", () => {
  it("adds itself to its owner's hand after a real security check", async () => {
    const s = setupEngine({
      0: { security: [{ card: P_021, as: "option" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
    });
    const optionId = s.inst("option").instanceId;
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === optionId), 5000);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    assertNoLoudGap(s);
  });
});
