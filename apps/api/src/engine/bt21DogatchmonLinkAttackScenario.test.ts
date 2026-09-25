import { GameState, Phase, PlayerState, type DecisionRequest, type Seat, type ServerEvent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layDevScenario } from "./devScenario.js";
import { GameEngine } from "./GameEngine.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { settle } from "./testkit/harness.js";
import "../cards/index.js";

function layScenario(): GameState {
  const state = new GameState();
  state.players.push(new PlayerState(), new PlayerState());
  layDevScenario("arena-bt21-dogatchmon-link-attack", state, [BLUE_DECK, RED_DECK]);
  return state;
}

describe("arena-bt21-dogatchmon-link-attack dev scenario", () => {
  it("stages DoGatchmon, Haru Shinkai, and a Navimon link card", () => {
    const state = layScenario();
    const human = state.players[0]!;

    expect(human.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT21-018", "BT21-084"]);
    expect(human.hand.map(({ cardId }) => cardId)).toContain("BT21-047");
    expect(state.players[1]!.security.length).toBeGreaterThan(0);
    expect(state.turnSeat).toBe(0);
    expect(state.memory).toBe(3);
  });

  it("resolves Haru's pending link watcher before DoGatchmon's attack checks security (CR 11-1-4, Q819)", async () => {
    const state = layScenario();
    state.phase = Phase.Main;
    const events: ServerEvent[] = [];
    let engine: GameEngine | undefined;
    const answer = (seat: Seat, request: DecisionRequest): void => {
      const respond = (response: object): void => {
        queueMicrotask(() =>
          engine?.applyIntent(seat, {
            type: "respondDecision",
            decisionId: request.decisionId,
            response,
          } as never),
        );
      };
      if (request.kind === "orderTriggers") {
        const keys = request.options?.triggerKeys ?? [];
        const cardIds = request.options?.triggerCardIds ?? [];
        const dogatchmon = keys[cardIds.indexOf("BT21-018")] ?? keys[0]!;
        respond({ kind: "orderTriggers", order: [dogatchmon] });
      } else if (request.kind === "optional") {
        respond({ kind: "optional", accept: request.promptText !== "AppFuse" });
      } else if (request.kind === "selectCards") {
        const candidates = request.options?.candidateInstanceIds ?? [];
        const min = Math.max(1, request.options?.min ?? 1);
        respond({
          kind: "selectCards",
          instanceIds: candidates.includes("player") ? ["player"] : candidates.slice(0, min),
        });
      } else if (request.kind === "counter" || request.kind === "block") {
        respond({ kind: request.kind, decline: true });
      }
    };
    engine = new GameEngine(state, { seed: 1, emit: (event) => events.push(event), requestDecision: answer });
    await engine.recomputeContinuousEffects();

    const human = state.players[0]!;
    const dogatchmon = human.battleArea.find(({ topCard }) => topCard.cardId === "BT21-018")!;
    const haru = human.battleArea.find(({ topCard }) => topCard.cardId === "BT21-084")!;
    const navimon = human.hand.find(({ cardId }) => cardId === "BT21-047")!;
    const securityBefore = state.players[1]!.security.length;
    const battleAreaBefore = human.battleArea.map(({ permanentId }) => permanentId);

    expect(
      engine.applyIntent(0, {
        type: "linkCard",
        instanceId: navimon.instanceId,
        targetPermanentId: dogatchmon.permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => state.players[1]!.security.length < securityBefore && haru.isSuspended);
    await settle(() => events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT21-018"));
    expect(human.battleArea.map(({ permanentId }) => permanentId)).toEqual(battleAreaBefore);

    const attackIndex = events.findIndex((event) => event.kind === "attackDeclared");
    const haruSuspendIndex = events.findIndex(
      (event) =>
        event.kind === "cardsMoved" && event.to === "suspended" && event.instanceIds.includes(haru.permanentId),
    );
    const securityIndex = events.findIndex((event) => event.kind === "securityRevealed");
    expect(attackIndex).toBeGreaterThanOrEqual(0);
    expect(haruSuspendIndex).toBeGreaterThan(attackIndex);
    expect(securityIndex).toBeGreaterThan(haruSuspendIndex);
  });
});
