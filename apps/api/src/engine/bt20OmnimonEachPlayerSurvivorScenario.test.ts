import { GameState, Phase, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { createEvaluationPolicy } from "../bot/policy.js";
import { buildBotView } from "../bot/view.js";
import { layDevScenario } from "./devScenario.js";
import { GameEngine, type GameEngineHooks } from "./GameEngine.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

const SCENARIO = "arena-bt20-omnimon-each-player-survivor";

describe("BT20 Omnimon (X Antibody) Discord arena scenario", () => {
  it("makes the bot attack the player whose breeding King Drasil holds Omekamon", async () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());
    layDevScenario(SCENARIO, state, [BLUE_DECK, RED_DECK]);
    state.turnCount = 1;
    state.phase = Phase.Main;

    const human = state.players[0]!;
    expect(human.battleArea).toHaveLength(0);
    expect(human.security).toHaveLength(2);
    expect(human.breeding?.topCard.cardId).toBe("BT13-007");
    expect(human.breeding?.stack.map(({ cardId }) => cardId)).toEqual(["BT20-083"]);
    expect(human.hand.map(({ cardId }) => cardId)).toEqual(["BT20-102"]);

    const hooks: GameEngineHooks = { seed: 1, emit: () => {}, requestDecision: () => {} };
    const engine = new GameEngine(state, hooks);
    await engine.recomputeContinuousEffects();
    const botView = buildBotView(state, 1);
    expect(botView).toBeDefined();
    expect(createEvaluationPolicy({ seed: 1 }).chooseMainAction(botView!)).toEqual({
      type: "attack",
      attackerPermanentId: "dev-perm-1-omnimon-attacker",
      target: { kind: "player" },
    });
  });

  it("keeps Omnimon after Omekamon digivolves into it as the only Digimon (Discord 1555074299344191549)", async () => {
    const preferInstanceIds = ["dev-field-1-omnimon-resting"];
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds });
    layDevScenario(SCENARIO, s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    const bot = s.state.players[1]!;

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: "dev-perm-1-omnimon-attacker",
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => bot.battleArea.length === 0 && s.state.pendingDecision === undefined);

    const survivorChoice = s.decisions.find(
      ({ req }) => req.kind === "chooseTargets" && req.sourceCardId === "BT20-102",
    );
    expect(survivorChoice?.req.options?.candidateInstanceIds).toEqual([
      "dev-perm-1-omnimon-attacker",
      "dev-perm-1-omnimon-resting",
    ]);
    expect(survivorChoice?.req.options?.targetFate).toBeUndefined();
    expect(human.battleArea).toHaveLength(1);
    expect(human.battleArea[0]!.topCard.cardId).toBe("BT20-102");
    expect(human.battleArea[0]!.stack.map(({ cardId }) => cardId)).toEqual(["BT20-083"]);
    expect(bot.trash.map(({ cardId }) => cardId)).toContain("AD1-004");
    expect(bot.deck.at(-1)?.cardId).toBe("AD1-011");

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
