import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-068.js";
import "./BT18-068.js";

describe("BT18-068 Wisemon", () => {
  it("chooses either player's deck and returns all five cards to that deck", async () => {
    expect(compiled.effects.slice(1, 3)).toMatchObject([
      { trigger: "OnPlay", actions: [{ kind: "RevealAdd", controller: "any", revealCount: 5 }] },
      { trigger: "WhenDigivolving", actions: [{ kind: "RevealAdd", controller: "any", revealCount: 5 }] },
    ]);
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-068", as: "wisemon" }] },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoChooseOption: false },
    );
    s.state.memory = 10;
    const topFive = s.state.players[1]!.deck.slice(0, 5).map((card) => card.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wisemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseOption");
    const deckChoice = s.state.pendingDecision!;
    expect(JSON.parse(deckChoice.payloadJson)).toMatchObject({ choices: ["Your deck", "Opponent's deck"] });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: deckChoice.decisionId,
        response: { kind: "chooseOption", optionIndex: 1 },
      }),
    ).toEqual({ ok: true });

    await settle(
      () => s.state.pendingDecision?.kind === "chooseOption" && s.state.pendingDecision.decisionId !== deckChoice.decisionId,
    );
    const destinationChoice = s.state.pendingDecision!;
    expect(JSON.parse(destinationChoice.payloadJson)).toMatchObject({ choices: ["top", "bottom"] });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: destinationChoice.decisionId,
        response: { kind: "chooseOption", optionIndex: 0 },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.length === 6 && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.deck.slice(0, 5).map((card) => card.instanceId)).toEqual(topFive);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT18-068")).toBe(true);
    assertNoLoudGap(s);
  });

  it("returns the five revealed cards to the chosen deck destination and has Blocker", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-068", as: "wisemon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    const topFive = s.state.players[0]!.deck.slice(0, 5).map((card) => card.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wisemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 6);
    await s.ready();

    expect(s.state.players[0]!.deck).toHaveLength(6);
    expect(s.state.players[0]!.deck.slice(0, 5).map((card) => card.instanceId)).toEqual(topFive);
    const wisemon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT18-068")!;
    expect(observe(s.engine).hasKeyword(wisemon, "Blocker")).toBe(true);
  });
});
