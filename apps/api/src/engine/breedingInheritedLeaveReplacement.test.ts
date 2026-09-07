import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { setupEngine, type EngineSetup } from "./testkit/harness.js";
import "../cards/index.js";

/**
 * Triage for the BT23-075 lane's "turn loop hangs with a breeding permanent" witness.
 *
 * The Breeding phase is an INTERACTIVE window (Comprehensive Rules §6-4-1-3): when the turn
 * player CAN hatch or move, the engine opens the window and waits for a breeding verb or an
 * `endPhase` skip. Nothing auto-answers it — not `settle`, not `waitForMainPhase` — so a
 * fixture that jumps straight to Main sits in Breeding until its tick budget runs out. That is
 * the reported "hang": a missing skip in the fixture, not a stuck engine.
 *
 * Both hosts below reach Main once the window is answered, including the BT23-073-over-BT22-007
 * stack whose inherited `wouldLeavePlay` replacement was suspected.
 */
async function skipBreedingAndReachMain(s: EngineSetup): Promise<{ breedingWindowOpened: boolean }> {
  let breedingWindowOpened = false;
  for (let tick = 0; tick < 400; tick += 1) {
    if (s.state.phase === Phase.Main) return { breedingWindowOpened };
    if (s.state.phase === Phase.Breeding) {
      // The only way out of an open breeding window: the turn player's own skip.
      breedingWindowOpened = s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" }).ok || breedingWindowOpened;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`The turn loop stalled in ${Phase[s.state.phase]}`);
}

function breedingBoard(host: string, under: string[]) {
  return {
    0: {
      breeding: { card: host, as: "breeder", under },
      deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
      security: ["BT1-009", "BT1-010", "BT1-011"],
    },
    1: {
      deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
      security: ["BT1-009", "BT1-010", "BT1-011"],
    },
  };
}

describe("a breeding permanent does not stall the turn loop", () => {
  it("reaches seat 0's Main phase with BT23-073 over [Mother Eater]", async () => {
    const s = setupEngine(breedingBoard("BT23-073", ["BT22-007"]), {
      autoSelectCards: true,
      autoAcceptOptional: true,
    });
    await s.ready();
    const loop = s.engine.startTurnLoop();
    const { breedingWindowOpened } = await skipBreedingAndReachMain(s);

    expect(breedingWindowOpened).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("reaches seat 0's Main phase with BT22-079 over [Mother Eater]", async () => {
    const s = setupEngine(breedingBoard("BT22-079", ["BT22-007"]), {
      autoSelectCards: true,
      autoAcceptOptional: true,
    });
    await s.ready();
    const loop = s.engine.startTurnLoop();
    const { breedingWindowOpened } = await skipBreedingAndReachMain(s);

    expect(breedingWindowOpened).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
