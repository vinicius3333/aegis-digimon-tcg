import { describe, it, expect } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./P-097.js";

// A3 for P-097 (Zubamon) — two effects:
//   (1) [On Play] (optional) By placing this card under 1 of your other Digimon as its
//       bottom digivolution card, reveal top 3 of deck and choose their destination/order.
//       Then, if a [Legend-Arms] trait Digimon is in play, gain 2 memory.
//   (2) [Your Turn][Inherited] While you have a [Legend-Arms] OR black Digimon in play,
//       this Digimon gains ＜Raid＞. source: documented behavior.
//
// FAILS-WHEN-REVERTED:
//   (1) Without the onPlay effect, the 3 revealed cards are not reordered at the chosen
//       deck edge after playing P-097 with another Digimon in play.
//   (2) Without the staticModifier, no Raid keyword is granted on the inherited permanent.

interface LedgerReader {
  hasKeyword(permanentId: string, keyword: string): boolean;
}

function ledgerOf(s: EngineSetup): LedgerReader {
  return (s.engine as unknown as { continuous: LedgerReader }).continuous;
}

// P-097 Zubamon — Red Lv.3, playCost 3, owned digivolution target: BT3-008 Zubamon (Legend-Arms).
// BT3-008 Zubamon is a Red Lv.3 with [Legend-Arms] type — used as the "other Digimon" host.
const ZUBAMON = "P-097";
const LEGEND_ARMS_HOST = "BT3-008"; // Legend-Arms Red Lv.3 Zubamon
const BLACK_NON_LEGEND_ARMS = "BT2-055"; // ToyAgumon, Black Lv.3, Puppet

describe("P-097 [On Play] places self under another Digimon and reorders the revealed cards", () => {
  it("exposes top/bottom and ordering decisions, then puts the chosen order on top", async () => {
    const s = setupEngine(
      {
        0: {
          // The host Digimon that P-097 will be placed under.
          battleArea: [{ card: LEGEND_ARMS_HOST, dp: 3000, as: "host" }],
          hand: [{ card: ZUBAMON, as: "zubamon" }],
          deck: [
            { card: "BT1-009", as: "d0" },
            { card: "BT1-010", as: "d1" },
            { card: "BT1-011", as: "d2" },
            { card: "BT1-009" },
            { card: "BT1-009" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: false },
    );
    const p0 = s.state.players[0]!;
    s.state.memory = 10;

    const top3 = [s.inst("d0").instanceId, s.inst("d1").instanceId, s.inst("d2").instanceId];
    const zubamonId = s.inst("zubamon").instanceId;

    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: zubamonId });
    expect(result).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseOption");

    const destination = s.decisions.at(-1)!.req;
    expect(destination.sourceCardId).toBe("P-097");
    expect(destination.options?.choices).toEqual(["top", "bottom"]);
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: destination.decisionId,
      response: { kind: "chooseOption", optionIndex: 0 },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    const ordering = s.decisions.at(-1)!.req;
    const chosenOrder = [top3[2]!, top3[0]!, top3[1]!];
    expect(ordering.sourceCardId).toBe("P-097");
    expect(ordering.options?.orderDestination).toBe("deckTop");
    expect(ordering.options?.candidateInstanceIds).toEqual(top3);
    expect(ordering.options?.visibleCards).toEqual([
      { instanceId: top3[0]!, cardId: "BT1-009" },
      { instanceId: top3[1]!, cardId: "BT1-010" },
      { instanceId: top3[2]!, cardId: "BT1-011" },
    ]);
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: ordering.decisionId,
      response: { kind: "orderCards", order: chosenOrder },
    })).toEqual({ ok: true });

    const host = s.perm("host");
    await settle(() =>
      host.stack.some((card) => card.instanceId === zubamonId) &&
      p0.deck[0]?.instanceId === chosenOrder[0] &&
      s.state.memory === 9
    );

    // P-097 is now under the host Digimon as a digivolution card.
    expect(host.stack.some((c) => c.instanceId === zubamonId)).toBe(true);
    // P-097 should no longer be on the battle area as a standalone permanent
    // (it was placed under the host, not played to a new slot).
    expect(p0.battleArea.some((p) => p.topCard?.instanceId === zubamonId)).toBe(false);
    expect(p0.deck.length).toBe(5);
    expect(p0.deck.slice(0, 3).map((card) => card.instanceId)).toEqual(chosenOrder);
    expect(s.state.memory).toBe(9); // 10 - play cost 3 + Legend-Arms memory 2
  });

  it("may decline the By-cost without moving itself or revealing the deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LEGEND_ARMS_HOST, as: "host" }],
          hand: [{ card: ZUBAMON, as: "zubamon" }],
          deck: [
            { card: "BT1-009", as: "deckTop" },
            "BT1-010",
            "BT1-011",
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    const topId = s.inst("deckTop").instanceId;
    const zubamonId = s.inst("zubamon").instanceId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: zubamonId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.instanceId === zubamonId,
    ));
    await settle(() => false, 30);

    expect(s.perm("host").stack.some((card) => card.instanceId === zubamonId)).toBe(false);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(topId);
    expect(s.state.memory).toBe(7);
  });
});

describe("P-097 [Your Turn][Inherited] gains ＜Raid＞ with Legend-Arms or Black Digimon in play", () => {
  it("grants Raid on the host permanent when a Legend-Arms Digimon is in play (inherited)", async () => {
    // Build: P-097 as a digivolution card under a Legend-Arms host.
    const s = setupEngine({
      0: { battleArea: [{ card: LEGEND_ARMS_HOST, dp: 3000, as: "host", under: [ZUBAMON] }] },
    });

    await s.engine.recomputeContinuousEffects();

    // The inherited static effect should grant Raid on the host permanent.
    expect(ledgerOf(s).hasKeyword(s.perm("host").permanentId, "Raid")).toBe(true);
  });

  it("grants Raid when a black Digimon (non-Legend-Arms) is in play", async () => {
    // Two permanents: a host carrying P-097 (Red) + a separate Black Digimon.
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-015", dp: 4000, as: "host", under: [ZUBAMON] }, // Greymon Lv.4 Red (not Legend-Arms)
          // A separate black Digimon with no Legend-Arms trait proves the color-only branch.
          { card: BLACK_NON_LEGEND_ARMS, dp: 3000, as: "blackDigimon" },
        ],
      },
    });

    await s.engine.recomputeContinuousEffects();

    expect(ledgerOf(s).hasKeyword(s.perm("host").permanentId, "Raid")).toBe(true);
  });

  it("does NOT grant Raid when no Legend-Arms or Black Digimon is in play", async () => {
    // Host carrying P-097, but no Legend-Arms or black Digimon on the field.
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-015", dp: 4000, as: "host", under: [ZUBAMON] }] }, // Red Greymon only
    });

    await s.engine.recomputeContinuousEffects();

    // Guard fails → no Raid grant.
    expect(ledgerOf(s).hasKeyword(s.perm("host").permanentId, "Raid")).toBe(false);
  });

  it("does NOT grant Raid on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: LEGEND_ARMS_HOST, dp: 3000, as: "host", under: [ZUBAMON] }] },
    });
    s.state.turnSeat = 1; // opponent's turn

    await s.engine.recomputeContinuousEffects();

    // [Your Turn] gate fails → no Raid grant.
    expect(ledgerOf(s).hasKeyword(s.perm("host").permanentId, "Raid")).toBe(false);
  });
});
