import { describe, it, expect } from "vitest";
import { EffectTiming, type Seat } from "@aegis/shared";
import { setupEngine, type BoardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT20-090 (Yuuki — Purple Tamer).
//
// [Start of Your Turn] If you have 2 or less memory, set it to 3.
// [End of Your Turn] If you have 4 or fewer cards in your hand, by suspending this Tamer,
//   1 of your Digimon with the [Dark Dragon]/[Evil Dragon] trait attacks a player.
// [Security] Play this card without paying the cost.
//
// FAILS-WHEN-REVERTED: the [Start of Your Turn] sets memory to 3 when <= 2.

// BT11-079 = DarkLizardmon (Evil Dragon, Lv.3, dp 1000)
const YUUKI = "BT20-090";
const EVIL_DRAGON_DIGIMON = "BT11-079"; // DarkLizardmon, Evil Dragon

// Give each seat a deck (so the draw phase doesn't empty-deck) and, optionally, a hand
// card (so the main phase has an action). Board Spec baseline shared by every case below.
const DECK_FILLER = Array.from({ length: 5 }, () => "BT1-010");

interface Harness {
  s: EngineSetup;
  memoryAfterStartTurn: number[];
}

function harness(board: BoardSpec): Harness {
  const s = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true });
  s.state.turnSeat = 0;
  s.state.isFirstPlayersFirstTurn = true;

  const memoryAfterStartTurn: number[] = [];
  const engineAny = s.engine as unknown as {
    fireTiming(timing: EffectTiming, trigger?: unknown): Promise<void>;
  };
  const original = engineAny.fireTiming.bind(s.engine);
  engineAny.fireTiming = async (timing: EffectTiming, trigger?: unknown) => {
    const result = await original(timing, trigger);
    if (timing === EffectTiming.OnStartTurn) {
      memoryAfterStartTurn.push(s.state.memory);
    }
    return result;
  };

  return { s, memoryAfterStartTurn };
}

/**
 * Drive one turn via runOneTurn(): wait for Main phase open, then send endPhase.
 */
async function driveTurn(h: Harness, seat: Seat): Promise<void> {
  const turn = h.s.engine.runOneTurn();
  const mainPhase = (h.s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
  for (let i = 0; i < 500 && !mainPhase.isOpen; i++) await Promise.resolve();
  h.s.engine.applyIntent(seat, { type: "endPhase" });
  await turn;
}

describe("BT20-090 Yuuki — Tamer effects", () => {
  it("[Start of Your Turn] sets memory to 3 when it is <= 2", async () => {
    const h = harness({
      // Place Yuuki on the battle area for seat 0.
      0: { battleArea: [{ card: YUUKI, dp: 3000, as: "tamer" }], deck: DECK_FILLER, hand: ["BT1-010"] },
      1: { deck: DECK_FILLER, hand: ["BT1-010"] },
    });

    // Set memory to 1 (within the <= 2 threshold).
    h.s.state.memory = 1;
    h.s.state.turnSeat = 0;

    await driveTurn(h, 0);

    // The [Start of Your Turn] effect observed at the OnStartTurn window: memory raised to 3.
    expect(h.memoryAfterStartTurn.length).toBeGreaterThanOrEqual(1);
    expect(h.memoryAfterStartTurn[0]).toBe(3);
  });

  it("[Start of Your Turn] does NOT set memory to 3 when memory > 2", async () => {
    const h = harness({
      0: { battleArea: [{ card: YUUKI, dp: 3000, as: "tamer" }], deck: DECK_FILLER, hand: ["BT1-010"] },
      1: { deck: DECK_FILLER, hand: ["BT1-010"] },
    });

    h.s.state.memory = 5;
    h.s.state.turnSeat = 0;

    await driveTurn(h, 0);

    // Memory should remain at 5 at the OnStartTurn window (effect gated out).
    expect(h.memoryAfterStartTurn.length).toBeGreaterThanOrEqual(1);
    expect(h.memoryAfterStartTurn[0]).toBe(5);
  });

  it("[End of Your Turn] suspends Yuuki when conditions are met", async () => {
    const h = harness({
      0: {
        // Yuuki Tamer + an Evil Dragon Digimon (0 hand cards — satisfies <= 4 condition).
        battleArea: [
          { card: YUUKI, dp: 3000, as: "tamer" },
          { card: EVIL_DRAGON_DIGIMON, dp: 1000, as: "evilDragon" },
        ],
        deck: DECK_FILLER,
      },
      1: {
        deck: DECK_FILLER,
        hand: ["BT1-010"],
        // A security card so the forced attack resolves without ending the game abruptly.
        security: Array.from({ length: 5 }, () => "BT1-010"),
      },
    });
    const tamer = h.s.perm("tamer");

    h.s.state.memory = 0;
    h.s.state.turnSeat = 0;

    await driveTurn(h, 0);

    // The [End of Your Turn] effect resolved: Yuuki is now suspended.
    expect(tamer.isSuspended).toBe(true);
  });
});
