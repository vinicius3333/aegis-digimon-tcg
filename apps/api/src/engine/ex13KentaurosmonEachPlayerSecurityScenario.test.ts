import { GameState, Phase, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { createEvaluationPolicy } from "../bot/policy.js";
import { buildBotView } from "../bot/view.js";
import { layDevScenario } from "./devScenario.js";
import { GameEngine, type GameEngineHooks } from "./GameEngine.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { setupEngine, settle } from "./testkit/harness.js";

const SCENARIO = "arena-ex13-kentaurosmon-each-player-security";

describe("EX13 Kentaurosmon each-player security dev scenario", () => {
  it("stages Kentaurosmon alone against one ready bot attacker on the bot's turn", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario(SCENARIO, state, [BLUE_DECK, RED_DECK]);

    expect(state.turnSeat).toBe(1);
    expect(state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX13-036"]);
    expect(state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["ST1-10"]);
  });

  it("makes the bot attack the viewer with the staged Digimon", async () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());
    layDevScenario(SCENARIO, state, [BLUE_DECK, RED_DECK]);
    state.phase = Phase.Main;

    const hooks: GameEngineHooks = { seed: 1, emit: () => {}, requestDecision: () => {} };
    const engine = new GameEngine(state, hooks);
    await engine.recomputeContinuousEffects();

    const botView = buildBotView(state, 1);
    expect(botView).toBeDefined();
    expect(createEvaluationPolicy({ seed: 1 }).chooseMainAction(botView!)).toEqual({
      type: "attack",
      attackerPermanentId: state.players[1]!.battleArea[0]!.permanentId,
      target: { kind: "player" },
    });
  });

  it("places Kentaurosmon and the attacker on their owners' security at Counter", async () => {
    const s = setupEngine({ autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario(SCENARIO, s.state, [BLUE_DECK, RED_DECK]);
    await s.ready();
    const human = s.state.players[0]!;
    const bot = s.state.players[1]!;
    const kentaurosmon = human.battleArea[0]!;
    const attacker = bot.battleArea[0]!;
    const humanSecurityBefore = human.security.length;
    const botSecurityBefore = bot.security.length;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const counter = opened.eligibleCounters.find(({ instanceId }) => instanceId === kentaurosmon.topCard.instanceId);
    expect(counter).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: counter!.instanceId,
        effectKey: counter!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => human.security.length === humanSecurityBefore + 1 && s.state.pendingDecision === undefined);
    await settle(() => bot.security.length === botSecurityBefore + 1);

    expect(human.security[0]!.instanceId).toBe(kentaurosmon.topCard.instanceId);
    expect(bot.security[0]!.instanceId).toBe(attacker.topCard.instanceId);
    expect(human.battleArea).toHaveLength(0);
    expect(bot.battleArea).toHaveLength(0);
    expect(s.events.some(({ kind }) => kind === "securityChecked")).toBe(false);
  });
});
