import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-036.js";

describe("BT12-036 Mikemon", () => {
  it("gains 1 memory when its host deletes an opposing Digimon in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-038", as: "host", under: ["BT12-036"] }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first", suspended: true },
          { card: "BT1-010", as: "second", suspended: true },
        ],
      },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("first").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.memory).toBe(1);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("second").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.memory).toBe(1);
  });

  it("does not arm the inherited watcher on the opponent's turn", async () => {
    const offTurn = setupEngine({ 0: { battleArea: [{ card: "BT12-038", as: "host", under: ["BT12-036"] }] } });
    offTurn.state.turnSeat = 1;
    await offTurn.ready();
    expect(observe(offTurn.engine).subscriptions("whenDeletesInBattle", offTurn.perm("host").permanentId)).toHaveLength(
      0,
    );
  });
});
