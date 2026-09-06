import { describe, expect, it } from "vitest";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/BT20/BT20-096.js";
import "../cards/BT20/BT20-062.js";
import "../cards/BT20/index.js";

function entries(s: ReturnType<typeof setupEngine>, alias: string) {
  return JSON.parse(s.inst(alias).activatableEffectsJson || "[]") as { instanceId: string; effectKey: string }[];
}

describe("trash-resident Option Main classification", () => {
  it("surfaces BT20-096 from trash during a public Main phase and resolves the 6-memory return", async () => {
    const s = setupEngine(
      {
        0: { trash: [{ card: "BT20-096", as: "option" }], hand: ["BT1-010"], deck: ["BT1-010", "BT1-010"] },
        1: {
          battleArea: [
            { card: "BT20-062", as: "unsuspended" },
            { card: "BT20-062", suspended: true, as: "suspended" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const optionId = s.inst("option").instanceId;
    const effect = entries(s, "option").find((candidate) => candidate.instanceId === optionId);
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: optionId, effectKey: effect!.effectKey }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(optionId);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("unsuspended").instanceId)).toBe(
      false,
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("suspended").instanceId)).toBe(
      true,
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not surface the trash activation with more than four hand cards", async () => {
    const s = setupEngine({
      0: {
        trash: [{ card: "BT20-096", as: "option" }],
        hand: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        deck: ["BT1-010", "BT1-010"],
      },
      1: { battleArea: [{ card: "BT20-062", as: "target" }] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(entries(s, "option")).toEqual([]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not expose the trash activation from hand or during the opponent's turn", async () => {
    const hand = setupEngine({
      0: { hand: [{ card: "BT20-096", as: "option" }, "BT1-010"], deck: ["BT1-010"] },
      1: { deck: ["BT1-010"], hand: ["BT1-010"] },
    });
    hand.state.turnSeat = 0;
    await hand.ready();
    const handTurn = hand.engine.runOneTurn();
    await advance(hand.engine).waitForMainPhase(0);
    expect(entries(hand, "option")).toEqual([]);
    advance(hand.engine).endMainPhaseIfOpen(0);
    await handTurn;

    const opponent = setupEngine({
      0: { trash: [{ card: "BT20-096", as: "option" }] },
      1: { deck: ["BT1-010"], hand: ["BT1-010"] },
    });
    opponent.state.turnSeat = 1;
    await opponent.ready();
    const opponentTurn = opponent.engine.runOneTurn();
    await advance(opponent.engine).waitForMainPhase(1);
    expect(entries(opponent, "option")).toEqual([]);
    advance(opponent.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("uses the ordinary hand Main body without activating the trash branch", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT20-062"],
          hand: [
            { card: "BT20-096", as: "option" },
            { card: "BT1-010", as: "discard" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT20-062", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("option").instanceId, s.inst("discard").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).not.toContain(s.inst("option").instanceId);
  });
});
