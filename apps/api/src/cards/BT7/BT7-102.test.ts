import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import "./BT7-102.js";

// A3 for BT7-102 (Dino Memory Boost!) — proves the ＜Delay＞ option-permanent subsystem
// (shared with LM-033/LM-048/LM-062, see apps/api/src/cards/LM/delayActivation.test.ts) end
// to end on a HAND-WRITTEN card module (not compiled IR):
//
//   1. [Main] Suspend 1 opponent Digimon, THEN place this card in the owner's battle area
//      as a permanent (not the trash) — the effect runtime.PlaceDelayOptionCards, wired via
//      ctx.fx.placeOptionAsPermanent (primitives.ts), same primitive LM-048/LM-062 use.
//   2. ＜Delay＞ [Main] Gain 2 memory, gated by CanDeclareOptionDelayEffect
//      (Permanent.enterFieldTurnCount !== state.turnCount — "can't activate the turn this
//      card enters play"), activating by trashing the battle-area option permanent as cost.
//
// FAILS-WHEN-REVERTED: dropping the placeOptionAsPermanent call sends the resolved Option to
// the trash instead of the battle area (test 1 RED). Dropping the enterFieldTurnCount guard
// lets the Delay clause activate the same turn it entered (test 2 RED).

const DELAY_KEY = "BT7-102/delay-gain-2-memory";

function boosterBoard() {
  return setup(
    {
      0: {
        battleArea: [{ card: "BT1-064", dp: 3000 }], // §4-21 color-requirement source (Green)
        hand: [{ card: "BT7-102", as: "option" }],
      },
      1: { battleArea: [{ card: "AD1-001", dp: 3000, as: "foe" }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
}

function playBooster(s: ReturnType<typeof boosterBoard>): { instanceId: string } {
  const option = s.inst("option");
  s.state.memory = 3; // exactly the printed play cost
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({
    ok: true,
  });
  return { instanceId: option.instanceId };
}

describe("BT7-102 ＜Delay＞ option-permanent subsystem", () => {
  it("suspends an opponent Digimon and lands in the BATTLE AREA (not the trash)", async () => {
    const s = boosterBoard();
    const p0 = s.state.players[0] as PlayerState;
    const foe = s.perm("foe");

    playBooster(s);
    await settle(() =>
      p0.battleArea.some((perm) => perm.topCard?.cardId === "BT7-102") && foe.isSuspended,
    );

    expect(foe.isSuspended).toBe(true); // opponent Digimon suspended
    // NEGATIVE CONTROL: a wrong implementation that never calls placeOptionAsPermanent
    // would leave the resolved Option in the trash instead of the battle area.
    expect(p0.battleArea.some((perm) => perm.topCard?.cardId === "BT7-102")).toBe(true); // placed as permanent
    expect(p0.trash.some((c) => c.cardId === "BT7-102")).toBe(false); // NOT trashed
  });

  it("cannot activate <Delay> the turn it entered, but DOES on a later turn (trash + gain 2)", async () => {
    const s = boosterBoard();
    const p0 = s.state.players[0] as PlayerState;

    playBooster(s);
    await settle(() =>
      p0.battleArea.some((perm) => perm.topCard?.cardId === "BT7-102") &&
      s.state.pendingDecision === undefined,
    );
    const perm = p0.battleArea.find((p) => p.topCard?.cardId === "BT7-102")!;
    const optionInstanceId = perm.topCard!.instanceId;

    // NEGATIVE CONTROL: a wrong implementation that omits the enterFieldTurnCount gate
    // would let this same-turn activation succeed and gain memory immediately.
    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: optionInstanceId,
      effectKey: DELAY_KEY,
    }).ok).toBe(false);
    expect(s.state.memory).toBe(0); // same turn: gate blocks activation, no gain
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT7-102")).toBe(true); // still on board

    // A later turn: the gate passes.
    s.state.turnCount += 1;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: optionInstanceId,
        effectKey: DELAY_KEY,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory !== 0);

    expect(s.state.memory).toBe(2); // gained 2 memory
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT7-102")).toBe(false); // trashed (cost)
    expect(p0.trash.some((c) => c.cardId === "BT7-102")).toBe(true);
  });
});
