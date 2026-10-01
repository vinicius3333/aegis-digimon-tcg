import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST22-14 Barbamon", () => {
  it("trashes the opponent's hand down to six on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST22-14", as: "barbamon" }] },
        1: { hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("barbamon"));
    await settle(() => s.state.players[1]!.hand.length === 6);
    expect(s.state.players[1]!.hand).toHaveLength(6);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("deletes the opponent's lowest-level Digimon after the hand is five or fewer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST22-14", as: "barbamon" }] },
        1: {
          hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          battleArea: [
            { card: "BT1-009", as: "lowLevel" },
            { card: "BT1-020", as: "highLevel" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const lowLevelId = s.perm("lowLevel").permanentId;
    const highLevelId = s.perm("highLevel").permanentId;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("barbamon"));
    await settle(() => !s.state.players[1]!.battleArea.some((perm) => perm.permanentId === lowLevelId));
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === lowLevelId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === highLevelId)).toBe(true);
  });

  it("gives the opponent the discard decision before applying the five-card deletion check", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST22-14", as: "barbamon" }] },
      1: {
        hand: [{ card: "BT1-009", as: "chosenDiscard" }, "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        battleArea: [{ card: "BT1-009", as: "lowest" }],
      },
    });
    await s.ready();

    const resolution = advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("barbamon"));
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    expect(decision.seat).toBe(1);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("chosenDiscard").instanceId] },
      }),
    ).toEqual({ ok: true });
    await resolution;

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("chosenDiscard").instanceId)).toBe(true);
    expect(s.state.players[1]!.hand).toHaveLength(5);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

describe("ST22-14 Barbamon — KB Q&A rulings", () => {
  async function memoryPaidToPlay(opponentHand: number, opponentTrash: number): Promise<number> {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST22-14", as: "barbamon" }] },
        1: {
          hand: Array.from({ length: opponentHand }, () => "BT1-009"),
          trash: Array.from({ length: opponentTrash }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("barbamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === s.inst("barbamon").instanceId),
    );
    return 12 - s.state.memory;
  }

  it("does not reduce the cost when the opponent's hand and trash only total 10 cards (Q5447)", async () => {
    expect(await memoryPaidToPlay(5, 5)).toBe(12);
    expect(await memoryPaidToPlay(10, 0)).toBe(7);
    expect(await memoryPaidToPlay(0, 10)).toBe(7);
  });

  it("reduces the cost by 5 only once when both the hand and the trash have 10 cards (Q5448)", async () => {
    expect(await memoryPaidToPlay(10, 10)).toBe(7);
  });
});
