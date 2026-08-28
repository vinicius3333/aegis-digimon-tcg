import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../engine/testkit/advance.js";
import { setupEngine } from "../engine/testkit/harness.js";
import "./index.js";

/**
 * "[Start of Your Main Phase]" is owner-gated: the window fires at BOTH players'
 * main-phase starts, so every clause registered at EffectTiming.OnStartMainPhase must
 * check `isOwnersTurn()` itself.
 *
 * FAILS-WHEN-REVERTED: drop `&& source.isOwnersTurn()` from any card's `when` below and
 * the opponent-turn case gains memory.
 */
const OWNER_GATED_TAMERS = ["EX10-062", "EX11-057"];

describe("[Start of Your Main Phase] fires only on its owner's turn", () => {
  for (const cardId of OWNER_GATED_TAMERS) {
    it(`${cardId} gains memory on its owner's turn but not on the opponent's`, async () => {
      const board = {
        0: { battleArea: [{ card: cardId, as: "tamer" }] },
        1: { battleArea: [{ card: "BT1-009", as: "oppDigimon" }] },
      };

      const ownerTurn = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true });
      ownerTurn.state.memory = 0;
      ownerTurn.state.turnSeat = 0;
      await advance(ownerTurn.engine).fire(EffectTiming.OnStartMainPhase, ownerTurn.perm("tamer"));
      expect(ownerTurn.state.memory).toBe(1);

      const opponentTurn = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true });
      opponentTurn.state.memory = 0;
      opponentTurn.state.turnSeat = 1;
      await advance(opponentTurn.engine).fire(EffectTiming.OnStartMainPhase, opponentTurn.perm("tamer"));
      expect(opponentTurn.state.memory).toBe(0);
    });
  }
});
