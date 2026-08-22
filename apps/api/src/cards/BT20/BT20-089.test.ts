import { describe, it, expect } from "vitest";
import { EffectTiming, type Seat } from "@aegis/shared";
import { setupEngine, type BoardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import module from "./BT20-089.js";

// A3 for BT20-089 (Code Cracker Fang & Hacker Judge — Purple/Black Tamer).
//
// [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.
// [Inherited — All Turns] This Digimon with [Pulsemon] text or SoC/SEEKERS trait
//   gains ＜Alliance＞, ＜Piercing＞ and ＜Barrier＞.
// [Inherited — End of All Turns] Play 1 [Eiji Nagasumi] from this Digimon's
//   digivolution cards without paying the cost.
//
// FAILS-WHEN-REVERTED: [Start of Your Main Phase] memory gain fires — the memory
//   increases by 1 when the opponent has a Digimon.

// BT20-089 = Code Cracker Fang & Hacker Judge
const CC_FANG = "BT20-089";
// BT1-010 = Agumon (cheap Digimon for opponent)
const AGUMON = "BT1-010";

// Give each seat cards so draw phase and main phase have something to work with.
const DECK_FILLER = Array.from({ length: 5 }, () => "BT1-010");

interface Harness {
  s: EngineSetup;
  memoryAfterStartMainPhase: number[];
}

function harness(board: BoardSpec): Harness {
  const s = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true });
  s.state.turnSeat = 0;
  s.state.isFirstPlayersFirstTurn = true;

  const memoryAfterStartMainPhase: number[] = [];
  const engineAny = s.engine as unknown as {
    fireTiming(timing: EffectTiming, trigger?: unknown): Promise<void>;
  };
  const original = engineAny.fireTiming.bind(s.engine);
  engineAny.fireTiming = async (timing: EffectTiming, trigger?: unknown) => {
    const result = await original(timing, trigger);
    if (timing === EffectTiming.OnStartMainPhase) {
      memoryAfterStartMainPhase.push(s.state.memory);
    }
    return result;
  };

  return { s, memoryAfterStartMainPhase };
}

async function driveTurn(h: Harness, seat: Seat): Promise<void> {
  const turn = h.s.engine.runOneTurn();
  const mainPhase = (h.s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
  for (let i = 0; i < 500 && !mainPhase.isOpen; i++) await Promise.resolve();
  h.s.engine.applyIntent(seat, { type: "endPhase" });
  await turn;
}

describe("BT20-089 Code Cracker Fang & Hacker Judge — Tamer effects", () => {
  it("keeps the Rule name treatment permanent", () => {
    const rule = module.effectsForTiming(EffectTiming.None, {
      cardId: CC_FANG,
      instanceId: "TEST#1",
      ownerSeat: 0,
    } as never).find((effect) => effect.effectKey.endsWith("rule-name-eiji"));
    expect(rule).toBeDefined();
    expect(rule?.description).toContain("Also treated as [Eiji Nagasumi]");
  });

  it("[Start of Your Main Phase] gains 1 memory when opponent has a Digimon", async () => {
    const h = harness({
      // Place CC Fang on seat 0's battle area.
      0: { battleArea: [{ card: CC_FANG, dp: 3000 }], deck: DECK_FILLER, hand: ["BT1-010"] },
      // Seat 1 has an Agumon in battle area (condition: opponent has a Digimon).
      1: { battleArea: [{ card: AGUMON, dp: 2000 }], deck: DECK_FILLER, hand: ["BT1-010"] },
    });

    h.s.state.memory = 0;
    h.s.state.turnSeat = 0;

    await driveTurn(h, 0);

    // The [Start of Your Main Phase] effect should have run and gained 1 memory.
    expect(h.memoryAfterStartMainPhase.length).toBeGreaterThanOrEqual(1);
    expect(h.memoryAfterStartMainPhase[0]).toBeGreaterThan(0);
  });

  it("[Start of Your Main Phase] does NOT gain memory when opponent has no Digimon", async () => {
    const h = harness({
      0: { battleArea: [{ card: CC_FANG, dp: 3000 }], deck: DECK_FILLER, hand: ["BT1-010"] },
      // Seat 1 has no Digimon in battle area.
      1: { deck: DECK_FILLER, hand: ["BT1-010"] },
    });

    h.s.state.memory = 0;
    h.s.state.turnSeat = 0;

    await driveTurn(h, 0);

    // Memory at OnStartMainPhase should be 0 (no gain fired).
    expect(h.memoryAfterStartMainPhase.length).toBeGreaterThanOrEqual(1);
    expect(h.memoryAfterStartMainPhase[0]).toBe(0);
  });
});
