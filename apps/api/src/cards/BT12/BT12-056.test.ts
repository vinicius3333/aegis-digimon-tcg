import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-056.js";

describe("BT12-056 GranKuwagamon", () => {
  it("digivolves from Dinobeemon for 3, suspends an opponent, and may decline the attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-055", as: "dino" }],
          hand: [{ card: "BT12-056", as: "gran" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT12-043", as: "target", dp: 15000 }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dino").permanentId,
        instanceId: s.inst("gran").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dino").topCard.cardId === "BT12-056");
    expect(s.state.memory).toBe(1);
    expect(s.perm("dino").stack.map(({ cardId }) => cardId)).toEqual(["BT12-055"]);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("dino"))).toBe(false);
  });

  it("ends without attacking when no opposing Digimon exists", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT12-056", as: "gran" }] }, 1: { security: ["BT1-009"] } },
      { autoAcceptOptional: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gran"));
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("gran"))).toBe(false);
  });

  it("may attack the Digimon it suspends", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-056", as: "gran" }] },
        1: { battleArea: [{ card: "BT12-043", as: "target", dp: 15000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const granId = s.inst("gran").instanceId;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gran"));
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([granId]);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("gains memory once when opposing Digimon become suspended during its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-056", as: "gran" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    await s.ready();
    s.state.memory = 0;
    await advance(s.engine).verb.suspend([s.perm("target").permanentId]);
    await settle(() => s.state.memory === 1);
    s.perm("target").isSuspended = false;
    await advance(s.engine).verb.suspend([s.perm("target").permanentId]);
    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory for an opposing Tamer or during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-056", as: "gran" }] },
      1: { battleArea: [{ card: "BT12-094", as: "tamer" }] },
    });
    await s.ready();
    s.state.memory = 0;
    await advance(s.engine).fireForPermanent(EffectTiming.OnTappedAnyone, s.perm("gran"), {
      suspendedPermanentId: s.perm("tamer").permanentId,
    });
    expect(s.state.memory).toBe(0);
    const offTurn = setupEngine({
      0: { battleArea: [{ card: "BT12-056", as: "gran" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    offTurn.state.turnSeat = 1;
    await offTurn.ready();
    await advance(offTurn.engine).verb.suspend([offTurn.perm("target").permanentId]);
    expect(offTurn.state.memory).toBe(0);
  });
});
