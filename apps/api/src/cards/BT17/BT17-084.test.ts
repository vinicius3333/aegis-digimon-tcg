import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";

const TAMER = "BT17-084";
const FREE_DIGIMON = "BT8-038";
const NON_FREE_DIGIMON = "BT1-032";
const OPPONENT_DIGIMON = "BT1-009";

async function fireEndOfTurn(engine: unknown): Promise<void> {
  await (engine as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(EffectTiming.OnEndTurn);
}

describe("BT17-084 Davis Motomiya & Ken Ichijoji — end-of-turn Free attack", () => {
  it("lets one of your Free Digimon attack an opponent's Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAMER, as: "tamer" },
            { card: FREE_DIGIMON, as: "free" },
          ],
          security: [{ card: OPPONENT_DIGIMON, faceUp: true }],
        },
        1: { battleArea: [{ card: OPPONENT_DIGIMON, as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await fireEndOfTurn(s.engine);
    await settle(() => s.perm("free").isSuspended, 400);

    expect(s.perm("free").isSuspended).toBe(true);
  });

  it("does not use a suspended or non-Free Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TAMER, as: "tamer" },
            { card: FREE_DIGIMON, as: "suspendedFree", suspended: true },
            { card: NON_FREE_DIGIMON, as: "nonFree" },
          ],
        },
        1: { battleArea: [{ card: OPPONENT_DIGIMON, as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await fireEndOfTurn(s.engine);
    await settle(() => false, 100);

    expect(s.perm("suspendedFree").isSuspended).toBe(true);
    expect(s.perm("nonFree").isSuspended).toBe(false);
  });
});
