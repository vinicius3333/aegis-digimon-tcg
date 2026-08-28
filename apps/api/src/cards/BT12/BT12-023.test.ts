import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT12-023.js";

describe("BT12-023 Gekomon", () => {
  it("trashes the bottom evolution card of an opposing Digimon on an opponent attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-025", as: "host", under: ["BT12-023"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker" },
            { card: "BT12-025", as: "target", under: ["BT1-009", "BT1-010"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const bottom = s.perm("target").stack[0]!.instanceId;
    const upper = s.perm("target").stack[1]!.instanceId;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(bottom);
    expect(s.perm("target").stack.map(({ instanceId }) => instanceId)).toContain(upper);
  });

  it("resolves once per opponent turn and never on its controller's attack", async () => {
    const opponentTurn = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-025", as: "host", under: ["BT12-023"] }] },
        1: { battleArea: [{ card: "BT12-025", as: "attacker", under: ["BT1-009", "BT1-010"] }] },
      },
      { autoSelectCards: true },
    );
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();
    const trigger = { attackerPermanentId: opponentTurn.perm("attacker").permanentId };
    await advance(opponentTurn.engine).fireSubTrigger("whenOpponentAttacks", trigger);
    await advance(opponentTurn.engine).fireSubTrigger("whenOpponentAttacks", trigger);
    expect(opponentTurn.perm("attacker").stack).toHaveLength(1);

    const ownTurn = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-025", as: "host", under: ["BT12-023"] },
          { card: "BT12-025", as: "attacker", under: ["BT1-009"] },
        ],
      },
    });
    await ownTurn.ready();
    await advance(ownTurn.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: ownTurn.perm("attacker").permanentId,
    });
    expect(ownTurn.perm("attacker").stack).toHaveLength(1);
  });
});
