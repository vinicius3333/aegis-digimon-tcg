import { describe, expect, it } from "vitest";
import { setupEngine, settle, type PermanentSpec } from "../../engine/testkit/harness.js";
import "../BT1/BT1-101.js";
import "../ST2/ST2-16.js";
import "./BT5-022.js";

describe("BT5-022 Bulucomon", () => {
  it("gains 1 memory when your effect trashes an opponent's digivolution card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-028", as: "host", under: ["BT5-022", "BT5-023"] }] },
      1: { battleArea: [{ card: "BT4-073", as: "opponent", under: [{ card: "BT1-009", as: "source" }] }] },
    });
    await s.engine.recomputeContinuousEffects();
    const before = s.state.memory;
    await (s.engine as any).primitives.trashDigivolutionCards(
      s.perm("opponent").permanentId,
      [s.inst("source").instanceId],
      { byEffectSeat: 0 },
    );
    await settle(() => s.state.memory !== before);
    expect(s.state.memory - before).toBe(1);
  });

  it("does not gain memory when the opponent trashes their own source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-028", as: "host", under: ["BT5-022", "BT5-023"] }] },
      1: { battleArea: [{ card: "BT4-073", as: "opponent", under: [{ card: "BT1-009", as: "source" }] }] },
    });
    await s.engine.recomputeContinuousEffects();
    const before = s.state.memory;
    await (s.engine as any).primitives.trashDigivolutionCards(
      s.perm("opponent").permanentId,
      [s.inst("source").instanceId],
      { byEffectSeat: 1 },
    );
    await settle();
    expect(s.state.memory).toBe(before);
  });

  it("does not gain memory during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-028", as: "host", under: ["BT5-022", "BT5-023"] }] },
      1: { battleArea: [{ card: "BT4-073", as: "opponent", under: [{ card: "BT1-009", as: "source" }] }] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    const before = s.state.memory;

    await (s.engine as any).primitives.trashDigivolutionCards(
      s.perm("opponent").permanentId,
      [s.inst("source").instanceId],
      { byEffectSeat: 0 },
    );
    await settle();

    expect(s.state.memory).toBe(before);
  });

  it("does not count returning a Digimon to hand as trashing its sources", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-028", as: "host", under: ["BT5-022", "BT5-023"] }] },
      1: { battleArea: [{ card: "BT4-073", as: "opponent", under: [{ card: "BT1-009", as: "source" }] }] },
    });
    await s.engine.recomputeContinuousEffects();
    const before = s.state.memory;
    await (s.engine as any).primitives.returnToHand([s.perm("opponent").topCard.instanceId]);
    await settle();
    expect(s.state.memory).toBe(before);
  });

  it("gains memory only once when sources of two opponent Digimon are trashed", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-028", as: "host", under: ["BT5-022", "BT5-023"] }] },
      1: {
        battleArea: [
          { card: "BT4-073", as: "first", under: [{ card: "BT1-009", as: "source-a" }] },
          { card: "BT4-073", as: "second", under: [{ card: "BT1-010", as: "source-b" }] },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    const before = s.state.memory;
    await (s.engine as any).primitives.trashDigivolutionCards(
      s.perm("first").permanentId,
      [s.inst("source-a").instanceId],
      { byEffectSeat: 0 },
    );
    await (s.engine as any).primitives.trashDigivolutionCards(
      s.perm("second").permanentId,
      [s.inst("source-b").instanceId],
      { byEffectSeat: 0 },
    );
    await settle(() => s.state.memory !== before);
    expect(s.state.memory - before).toBe(1);
  });
});

describe("BT5-022 Bulucomon — KB Q&A rulings", () => {
  function bulucomonBoard(handOption: string, opponentBattleArea: PermanentSpec[]) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-028", as: "host", under: ["BT5-022", "BT5-023"] }],
          hand: [{ card: handOption, as: "option" }],
        },
        1: { battleArea: opponentBattleArea },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    return s;
  }

  it("does not gain memory when returning an opponent's Digimon to hand removes its sources (Q1305)", async () => {
    const s = bulucomonBoard("ST2-16", [
      { card: "BT4-073", as: "opponent", under: [{ card: "BT1-009", as: "source" }] },
    ]);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.length === 1);
    await settle();

    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["BT4-073"]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("source").instanceId]);
    expect(s.state.memory).toBe(0);

    const control = bulucomonBoard("BT1-101", [{ card: "BT4-073", as: "opponent", under: ["BT1-009"] }]);
    await control.ready();
    expect(control.engine.applyIntent(0, { type: "playCard", instanceId: control.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => control.state.memory === 1);
    expect(control.perm("opponent").stack).toHaveLength(0);
  });

  it("gains only 1 memory when sources of 2 opponent Digimon are trashed at the same time (Q1306)", async () => {
    const s = bulucomonBoard("BT1-101", [
      { card: "BT4-073", as: "first", under: ["BT1-009"] },
      { card: "BT4-073", as: "second", under: ["BT1-010"] },
    ]);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("first").stack.length === 0 && s.perm("second").stack.length === 0);
    await settle();

    expect(s.state.players[1]!.trash).toHaveLength(2);
    expect(s.state.memory).toBe(1);
  });
});
