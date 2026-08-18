import { describe, it, expect, afterEach } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import { whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard, unregisterCard } from "../../engine/effects/registry.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import "../index.js";

// A3 behavioral test for BT15-041 (Babamon):
//   [On Play] 1 of your opponent's Digimon gets -6000 DP until the end of their turn.
//
// Primary observable: playing BT15-041 reduces an opp Digimon's DP by 6000.
//
// FAILS-WHEN-REVERTED: remove the [On Play] resolve body → opp Digimon DP stays unchanged.

describe("BT15-041 Babamon [On Play] -6000 DP", () => {
  it("playing Babamon reduces 1 opp Digimon's DP by 6000", async () => {
    const s = setup(
      {
        0: { hand: [{ card: "BT15-041", as: "card" }] },
        // Monodramon Lv.3 with 8000 DP.
        1: { battleArea: [{ card: "BT1-009", dp: 8000, as: "oppDigi" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const card = s.inst("card");
    const oppDigi = s.perm("oppDigi");

    const res = s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId });
    expect(res).toEqual({ ok: true });

    // Wait for DP to change (8000 - 6000 = 2000).
    await settle(() => oppDigi.currentDP < 8000, 600);

    expect(oppDigi.currentDP).toBe(2000); // 8000 - 6000
  });
});

// A3 for BT15-041's [End of Opponent's Turn] clause: "By deleting this Digimon, you may play
// 1 [Rosemon]/[Jijimon] from your hand without paying the cost. Then, activate the [When
// Digivolving] effects of the Digimon this effect played."
//
// FAILS-WHEN-REVERTED: without `reactivateOnPlay`, the play happens but the played
// [Rosemon]/[Jijimon]'s [When Digivolving] effect never re-fires.
//
// BT1-082 (a real, cataloged Rosemon) is overridden with a synthetic [When Digivolving]
// effect (gain 1 memory) so the assertion is a simple, self-contained memory delta.
const PLAYED_CARD = "BT1-082"; // Rosemon

describe("BT15-041 [End of Opponent's Turn] delete self to play Rosemon/Jijimon, reactivate its [When Digivolving]", () => {
  let fired = 0;
  const stub: EffectModule = {
    cardId: PLAYED_CARD,
    effectsForTiming(timing, source) {
      if (timing !== EffectTiming.WhenDigivolving) return [];
      return [
        whenDigivolving({
          source,
          effectKey: `${PLAYED_CARD}/test-reactivate-target`,
          description: "test: [When Digivolving] gain 1 memory",
          resolve: async (ctx) => {
            fired += 1;
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    },
  };
  let original: EffectModule | undefined;

  afterEach(() => {
    unregisterCard(PLAYED_CARD);
    if (original !== undefined) registerCard(original);
    fired = 0;
  });

  it("deletes itself, plays Rosemon free, and re-fires Rosemon's [When Digivolving] effect", async () => {
    original = unregisterCard(PLAYED_CARD);
    registerCard(stub);

    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT15-041", dp: 8000, as: "babamon" }],
          hand: [{ card: PLAYED_CARD, as: "rosemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1; // the opponent's turn is ending
    s.state.memory = 5;
    const babamonId = s.perm("babamon").permanentId;

    await (
      s.engine as unknown as {
        fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnEndTurn, {});

    await settle(() => fired > 0, 400);

    // Babamon deleted itself (the cost).
    expect(s.state.players[0]?.battleArea.some((p) => p.permanentId === babamonId)).toBe(false);
    // Rosemon was played from hand without paying the cost.
    expect(s.state.players[0]?.battleArea.some((p) => p.topCard?.cardId === PLAYED_CARD)).toBe(true);
    // Its [When Digivolving] effect re-fired exactly once.
    expect(fired).toBe(1);
    // The owner is seat 0 while seat 1's turn is ending, so gaining one memory
    // for seat 0 moves the turn-relative gauge from 5 to 4.
    expect(s.state.memory).toBe(4);
  });
});
