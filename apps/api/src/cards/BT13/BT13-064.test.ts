import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-064.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-064 PawnChessmon", () => {
  it("keeps Blocker, opponent-turn restriction, and the eight-card level ceiling", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnDeletion", keywords: [expect.objectContaining({ keyword: "Blocker" })], actions: [expect.objectContaining({ kind: "PlayWithoutCost", condition: expect.objectContaining({ kind: "isOpponentsTurn" }) }), expect.objectContaining({ kind: "CostModifier", mode: "raiseCeiling", amount: 2 })] });
  });

  it("plays a level-3 Chessmon from hand when deleted during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-064", as: "pawn" }], hand: ["BT13-035"] }, 1: { security: ["BT1-001"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("pawn").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-035"), 3000);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-035")).toBe(true);
  });
});
