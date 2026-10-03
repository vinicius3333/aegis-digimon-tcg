import { GameState, Phase, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { createEvaluationPolicy } from "../bot/policy.js";
import { buildBotView } from "../bot/view.js";
import { layDevScenario } from "./devScenario.js";
import { GameEngine, type GameEngineHooks } from "./GameEngine.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { observe } from "./testkit/observe.js";
import { setupEngine, settle } from "./testkit/harness.js";

const SCENARIO = "arena-bt20-cool-boy-stacked-omekamon";
const CRANIAMON = "dev-perm-0-bt20-cool-boy-craniamon";
const ATTACKER = "dev-perm-1-bt20-cool-boy-attacker";
const OMEKAMON_IDS = ["dev-bt20-cool-boy-omekamon-first", "dev-bt20-cool-boy-omekamon-second"];

describe("BT20 Cool Boy stacked Omekamon dev scenario", () => {
  it("makes the bot attack the viewer with Omnimon", async () => {
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
      attackerPermanentId: ATTACKER,
      target: { kind: "player" },
    });
  });

  it("plays one Omekamon per Cool Boy when the blocking Craniamon is deleted (Discord bug 1555487329328693248)", async () => {
    const s = setupEngine({ autoAcceptOptional: false, autoOrderTriggers: false, autoSelectCards: true });
    layDevScenario(SCENARIO, s.state, [BLUE_DECK, RED_DECK]);
    await s.ready();

    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: ATTACKER, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: CRANIAMON })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");

    const plan = s.decisions.at(-1)!.req;
    expect(plan.options).toMatchObject({
      triggerCardIds: ["BT20-091", "BT20-091"],
      acceptsResolutionPlan: true,
      triggerIsOptional: [true, true],
    });
    const order = [...(plan.options?.triggerKeys ?? [])].reverse();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: plan.decisionId,
        response: {
          kind: "orderTriggers",
          order,
          optionalAnswers: Object.fromEntries(order.map((key) => [key, true])),
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    const human = s.state.players[0]!;
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toEqual([]);
    expect(human.battleArea.some((permanent) => permanent.permanentId === CRANIAMON)).toBe(false);
    for (const omekamonId of OMEKAMON_IDS) {
      expect(human.battleArea.some((permanent) => permanent.topCard?.instanceId === omekamonId)).toBe(true);
    }
    expect(human.hand).toHaveLength(0);

    // Each Cool Boy is announced on its own and plays its Omekamon before the next one starts.
    const coolBoyTimeline = s.events.flatMap((event) =>
      (event.kind === "effectTriggered" || event.kind === "effectResolved") && event.sourceCardId === "BT20-091"
        ? [`${event.kind}:${event.sourceInstanceId}`]
        : event.kind === "cardPlayed" && event.cardId === "BT20-083"
          ? ["cardPlayed"]
          : [],
    );
    const [second, first] = order.map((key) => key.split("::")[0]);
    expect(coolBoyTimeline).toEqual([
      `effectTriggered:${second}`,
      "cardPlayed",
      `effectResolved:${second}`,
      `effectTriggered:${first}`,
      "cardPlayed",
      `effectResolved:${first}`,
    ]);
  });
});
