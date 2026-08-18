import { describe, it, expect, afterEach } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import { onPlay } from "../../engine/effects/builders.js";
import { registerCard, unregisterCard } from "../../engine/effects/registry.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import "../index.js";

// A3 for BT24-102 (Homeros) — three clauses:
//   [Start of Your Main Phase] Gain 1 memory. If 5+, suspend this Tamer and Draw 1.
//   [All Turns] All of your [TS] trait Digimon get +1000 DP.
//   [End of Your Turn] By suspending this Tamer, activate 1 [On Play]/[When Digivolving]
//     effect of 1 of your [Olympos XII] trait Digimon.
//
// FAILS-WHEN-REVERTED: the pre-fix module (`// @ts-nocheck` one-liner) returned `[]` for both
// EffectTiming.None (the +1000 DP static) and EffectTiming.OnEndTurn (the reactivation), so
// neither DP boost nor cross-card reactivation ever happened.

const HOMEROS = "BT24-102";
const TS_DIGIMON = "BT24-009"; // Shamanmon — [TS] trait Digimon
const OLYMPOS_DIGIMON = "BT10-042"; // Venusmon — [Olympos XII] trait

describe("BT24-102 [Start of Your Main Phase] gain memory, suspend + draw at 5+", () => {
  it("gains 1 memory and, once at 5+, suspends and draws", async () => {
    const s = setup(
      {
        0: {
          battleArea: [{ card: HOMEROS, dp: 0, as: "homeros" }],
          deck: [{ card: "BT1-001", faceUp: false }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4; // + 1 = 5, crossing the threshold
    const p0 = s.state.players[0];
    const handBefore = p0?.hand.length ?? 0;

    await (
      s.engine as unknown as {
        fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnStartMainPhase, {});

    await settle(() => (p0?.hand.length ?? 0) > handBefore, 400);

    expect(s.state.memory).toBe(5);
    expect(s.perm("homeros").isSuspended).toBe(true);
    expect(p0?.hand.length).toBe(handBefore + 1);
  });

  it("does NOT suspend/draw when memory stays below 5", async () => {
    const s = setup(
      { 0: { battleArea: [{ card: HOMEROS, dp: 0, as: "homeros" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2; // + 1 = 3, below threshold

    await (
      s.engine as unknown as {
        fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnStartMainPhase, {});
    await settle(() => false, 60);

    expect(s.state.memory).toBe(3);
    expect(s.perm("homeros").isSuspended).toBe(false);
  });
});

describe("BT24-102 [All Turns] [TS] trait Digimon get +1000 DP", () => {
  it("grants +1000 DP to a [TS] trait Digimon on the controller's field", async () => {
    const s = setup({
      0: {
        battleArea: [
          { card: HOMEROS, dp: 0, as: "homeros" },
          { card: TS_DIGIMON, dp: 2000, as: "tsDigi" },
        ],
      },
    });

    await (
      s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }
    ).recomputeContinuousEffects();

    expect(s.perm("tsDigi").currentDP).toBe(3000);
  });
});

describe("BT24-102 [End of Your Turn] suspend to activate an [Olympos XII] Digimon's [On Play]/[When Digivolving]", () => {
  let fired = 0;
  const stub: EffectModule = {
    cardId: OLYMPOS_DIGIMON,
    effectsForTiming(timing, source) {
      if (timing !== EffectTiming.OnPlay) return [];
      return [
        onPlay({
          source,
          effectKey: `${OLYMPOS_DIGIMON}/test-reactivate-target`,
          description: "test: [On Play] gain 1 memory",
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
    unregisterCard(OLYMPOS_DIGIMON);
    if (original !== undefined) registerCard(original);
    fired = 0;
  });

  it("suspends Homeros and re-fires the Olympos XII Digimon's [On Play] effect", async () => {
    original = unregisterCard(OLYMPOS_DIGIMON);
    registerCard(stub);

    const s = setup(
      {
        0: {
          battleArea: [
            { card: HOMEROS, dp: 0, as: "homeros" },
            { card: OLYMPOS_DIGIMON, dp: 5000, as: "olympos" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    await (
      s.engine as unknown as {
        fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnEndTurn, {});

    await settle(() => fired > 0, 400);

    expect(fired).toBe(1);
    expect(s.state.memory).toBe(6);
    expect(s.perm("homeros").isSuspended).toBe(true);
  });
});
