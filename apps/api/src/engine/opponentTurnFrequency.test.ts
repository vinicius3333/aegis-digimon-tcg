import { describe, expect, it } from "vitest";
import "../cards/EX6/EX6-052.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

/**
 * Drive one complete production turn and voluntarily pass its Main phase. The helper keeps
 * this regression on the public runOneTurn/applyIntent path instead of resetting the ledger
 * directly, which is the boundary that opponent-turn inherited triggers depend on.
 */
async function runTurn(s: ReturnType<typeof setupEngine>, seat: 0 | 1): Promise<void> {
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(seat);
  advance(s.engine).endMainPhaseIfOpen(seat);
  await turn;
}

describe("opponent-turn once-per-turn frequency", () => {
  it("refuses a second deletion in one opponent turn and re-arms on the next one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-049", as: "host", under: ["EX6-052"] }],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
          trash: [
            { card: "EX6-047", as: "revivedA" },
            { card: "EX6-047", as: "revivedB" },
          ],
        },
        1: {
          deck: Array.from({ length: 10 }, () => "BT1-009"),
          battleArea: [
            { card: "BT1-009", as: "victimA" },
            { card: "BT1-009", as: "victimB" },
            { card: "BT1-009", as: "victimC" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    // The real opponent turn arms the inherited watcher and consumes it on the first deletion.
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).verb.deletePermanent([s.perm("victimA").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("revivedA").instanceId));
    await advance(s.engine).verb.deletePermanent([s.perm("victimB").permanentId], "byEffect");
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("revivedB").instanceId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    // A complete owner turn and the next opponent turn must clear the shared subtrigger ledger.
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    await runTurn(s, 0);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const nextOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).verb.deletePermanent([s.perm("victimC").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("revivedB").instanceId));
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    advance(s.engine).endMainPhaseIfOpen(1);
    await nextOpponentTurn;
  });
});
