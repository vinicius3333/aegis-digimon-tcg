import { GameState, Phase, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { createEvaluationPolicy } from "../bot/policy.js";
import { buildBotView } from "../bot/view.js";
import { layDevScenario } from "./devScenario.js";
import { GameEngine, type GameEngineHooks } from "./GameEngine.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { setupEngine, settle } from "./testkit/harness.js";

const SCENARIO = "arena-mobile-blast-counter-tap";

describe("mobile Blast Counter tap dev scenario (Discord 1556418465231806535)", () => {
  it("makes the bot attack the viewer with the staged Phoenixmon", async () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());
    layDevScenario(SCENARIO, state, [BLUE_DECK, RED_DECK]);
    state.phase = Phase.Main;
    const hooks: GameEngineHooks = { seed: 1, emit: () => {}, requestDecision: () => {} };
    await new GameEngine(state, hooks).recomputeContinuousEffects();

    expect(createEvaluationPolicy({ seed: 1 }).chooseMainAction(buildBotView(state, 1)!)).toEqual({
      type: "attack",
      attackerPermanentId: state.players[1]!.battleArea[0]!.permanentId,
      target: { kind: "player" },
    });
  });

  it("offers Giromon as the lone Blast Digivolve host and digivolves it into BlackWarGreymon", async () => {
    const s = setupEngine({ autoAcceptOptional: false, autoSelectCards: true });
    layDevScenario(SCENARIO, s.state, [BLUE_DECK, RED_DECK]);
    await s.ready();
    const human = s.state.players[0]!;
    const giromon = human.battleArea.find(({ topCard }) => topCard.cardId === "BT13-071")!;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.state.players[1]!.battleArea[0]!.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    expect(opened.eligibleCounters.map(({ effectKey }) => effectKey)).toEqual([
      `blast-digivolve:${giromon.permanentId}`,
    ]);

    const [blast] = opened.eligibleCounters;
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: blast!.instanceId,
        effectKey: blast!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => giromon.topCard.cardId === "EX10-010" && s.state.pendingDecision === undefined);
    expect(giromon.topCard.cardId).toBe("EX10-010");
  });
});
