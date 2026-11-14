import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./BT12-019.js";

describe("BT12-019 Otamamon", () => {
  it("offers every opposing Digimon and trashes the chosen one's bottom evolution card when the opponent attacks", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-025", as: "host", under: ["BT12-019"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker" },
            { card: "BT12-025", as: "target", under: ["BT1-009", "BT1-010"] },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.turnSeat = 1;
    const bottom = s.perm("target").stack[0]!.instanceId;
    const upper = s.perm("target").stack[1]!.instanceId;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.decisions.find(({ req }) => req.kind === "chooseTargets")?.req.options?.candidateInstanceIds).toEqual([
      s.perm("attacker").permanentId,
      s.perm("target").permanentId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(bottom);
    expect(s.perm("target").stack.map(({ instanceId }) => instanceId)).toContain(upper);
  });

  it("resolves at most once per opponent turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-025", as: "host", under: ["BT12-019"] }] },
        1: { battleArea: [{ card: "BT12-025", as: "attacker", under: ["BT1-009", "BT1-010"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    expect(s.perm("attacker").stack).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("does not trigger on its controller's turn or without an opposing evolution card", async () => {
    const ownTurn = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-025", as: "host", under: ["BT12-019"] },
          { card: "BT12-025", as: "attacker", under: ["BT1-009"] },
        ],
      },
    });
    await ownTurn.ready();
    await advance(ownTurn.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: ownTurn.perm("attacker").permanentId,
    });
    expect(ownTurn.perm("attacker").stack).toHaveLength(1);

    const noSource = setupEngine({
      0: { battleArea: [{ card: "BT12-025", as: "host", under: ["BT12-019"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    noSource.state.turnSeat = 1;
    await noSource.ready();
    await advance(noSource.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: noSource.perm("attacker").permanentId,
    });
    expect(noSource.state.players[0]!.trash).toHaveLength(0);
  });
});
