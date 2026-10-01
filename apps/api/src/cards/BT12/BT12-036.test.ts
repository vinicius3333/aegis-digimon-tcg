import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../EX12/EX12-051.js";
import "../EX12/EX12-052.js";
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

  it("ignores a battle deletion by another of your Digimon (Discord 1555163238696484875)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-038", as: "host", under: ["BT12-036"] },
          { card: "BT12-038", as: "neighbor" },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true }] },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("neighbor").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(0);
  });

  it("ignores an effect battle won by another of your Digimon (Discord 1555163238696484875)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-051", as: "angoramon" },
            { card: "BT12-038", as: "host", under: ["BT12-036"] },
          ],
          hand: [{ card: "EX12-052", as: "digivolution" }],
          security: 3,
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }], security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("angoramon").permanentId,
        instanceId: s.inst("digivolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.pendingDecision === undefined);
    expect(s.perm("angoramon").topCard?.cardId).toBe("EX12-052");
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
