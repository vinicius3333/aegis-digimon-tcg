import { expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../EX2/EX2-009.js";
import "../EX2/EX2-056.js";

const INERT_DECK = ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"];
const INERT_SECURITY = ["BT1-009", "BT1-013", "BT1-014"];

/**
 * KB Q3348: seat 1's EX2-056 Takato grants <Blitz> when Guilmon "would digivolve" into
 * Growlmon, even though seat 0's inherited `costIncreaseSourceId` then raises the cost past
 * seat 1's memory and the digivolution fails. Growlmon costs 2, and seat 1 can pay exactly 2.
 */
export async function digivolveIntoGrowlmonPastCostIncrease(costIncreaseSourceId: string): Promise<{
  memoryAtBlitzGrant: number | undefined;
  finalTopCardId: string;
  growlmonStillInHand: boolean;
}> {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "EX3-020", as: "host", under: [costIncreaseSourceId] }],
        deck: INERT_DECK,
        security: INERT_SECURITY,
      },
      1: {
        battleArea: [
          { card: "EX2-008", as: "guilmon" },
          { card: "EX2-056", as: "takato" },
        ],
        hand: [{ card: "EX2-009", as: "growlmon" }],
        deck: INERT_DECK,
        security: INERT_SECURITY,
      },
    },
    { autoAcceptOptional: true, autoOrderTriggers: true },
  );
  s.state.memory = 8;
  await s.ready();
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = -8;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("guilmon").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    // The failed digivolution has no [When Digivolving] to process <Blitz>, so the turn can end
    // right after; read the board as the grant lands.
    let memoryAtGrant: number | undefined;
    await settle(() => {
      if (memoryAtGrant === undefined && observe(s.engine).hasKeyword(s.perm("guilmon"), "Blitz")) {
        memoryAtGrant = s.state.turnSeat === 1 ? s.state.memory : -s.state.memory;
      }
      return memoryAtGrant !== undefined;
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.turnSeat === 0);
    return {
      memoryAtBlitzGrant: memoryAtGrant,
      finalTopCardId: s.perm("guilmon").topCard.cardId,
      growlmonStillInHand: s.state.players[1]!.hand.some(
        ({ instanceId }) => instanceId === s.inst("growlmon").instanceId,
      ),
    };
  } finally {
    if (!s.state.gameOver) s.engine.applyIntent(1, { type: "surrender" });
    await loop;
  }
}
