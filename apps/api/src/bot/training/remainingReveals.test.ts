import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { trainingObservation } from "./observation.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import { trainingDeck, PILOT_DECK_VERSIONS } from "./decks.js";
import "../../cards/index.js";

function hasReveal(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  if ("kind" in value && value.kind === "RevealAdd") return true;
  return Object.values(value).some(hasReveal);
}

const cases = ([0, 1] as const).flatMap((seat) => [
  ...[[0, 1], [1, 0], [2, 0], [2, 1], []].map((picks) => ({ seat, cardId: "EX9-046", picks, security: false })),
  ...[false, true].flatMap((security) => [[0], [1], []].map((picks) => ({ seat, cardId: "EX1-066", picks, security }))),
]);

describe("remaining pinned-deck reveal producers through the asynchronous policy", () => {
  it("keeps the reveal producer inventory aligned with both pinned decks", () => {
    const ids = [
      ...new Set(
        PILOT_DECK_VERSIONS.flatMap((version) => {
          const { deck } = trainingDeck(version);
          return [...deck.mainDeck, ...deck.eggDeck];
        }),
      ),
    ];
    expect(ids.filter((id) => hasReveal(runtimeCompiledCard(id))).sort()).toEqual([
      "BT16-082",
      "BT25-032",
      "EX1-066",
      "EX9-046",
      "LM-033",
      "LM-054",
      "ST23-06",
    ]);
  });

  it.each(cases)(
    "seat=$seat source=$cardId picks=$picks security=$security",
    async ({ seat, cardId, picks, security }) => {
      const opponent = seat === 0 ? 1 : 0;
      const soundbird = cardId === "EX9-046";
      const noEligible = picks.length === 0;
      const revealCards = noEligible
        ? ["BT6-090", "ST15-14", "EX1-066"]
        : soundbird
          ? ["EX9-055", "EX9-057", "EX9-048"]
          : ["EX9-048", "BT25-020", "BT6-090"];
      const setup = setupEngine(
        {
          [seat]: {
            ...(security
              ? {
                  security: [
                    { card: cardId, as: "source" },
                    { card: "EX9-046", as: "security-tail" },
                  ],
                }
              : { hand: [{ card: cardId, as: "source" }] }),
            deck: [
              ...revealCards.map((card, index) => ({ card, as: `reveal-${index}` })),
              { card: "EX9-047", as: "hidden-tail" },
            ],
          },
          ...(security ? { [opponent]: { battleArea: [{ card: "EX9-048", as: "attacker" }] } } : {}),
        },
        { autoOrderCards: false, autoOrderTriggers: false },
      );
      setup.state.turnSeat = security ? opponent : seat;
      setup.state.memory = 10;
      await setup.ready();
      const sourceId = setup.inst("source").instanceId;
      const ids = revealCards.map((_, index) => setup.inst(`reveal-${index}`).instanceId);
      const hidden = setup.inst("hidden-tail").instanceId;
      const groups = new Map<string, TrainingWindow>();
      const orders: TrainingWindow[] = [];
      const initial = JSON.stringify(trainingObservation(setup.state, seat));
      for (const id of [...ids, hidden]) expect(initial).not.toContain(id);
      const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
        await Promise.resolve();
        if (window.kind === "main")
          return window.actions.findIndex(({ intent }) => intent.type === "playCard" && intent.instanceId === sourceId);
        if (window.kind === "orderCards") {
          orders.push(window);
          return window.actions.length - 1;
        }
        if (window.selected.length) return window.actions.findIndex((action) => action.label === "Finish selection");
        const key = window.request!.decisionId;
        if (!groups.has(key)) groups.set(key, window);
        return window.actions.findIndex((action) => action.sourceId === ids[picks[groups.size - 1]!]);
      });
      const attackerPolicy = createAsyncTrainingPolicy(setup.engine, opponent, async (window) => {
        await Promise.resolve();
        return window.actions.findIndex(({ intent }) => intent.type === "attack" && intent.target.kind === "player");
      });
      const actor = security ? opponent : seat;
      const actingPolicy = security ? attackerPolicy : policy;
      expect(
        setup.engine.applyIntent(actor, await actingPolicy.chooseMainAction(buildBotView(setup.state, actor)!)),
      ).toEqual({ ok: true });
      for (let step = 0; step < 12; step++) {
        await settle(() => setup.state.pendingDecision !== undefined || mainActionReady(setup.engine));
        const pending = setup.state.pendingDecision;
        if (!pending) break;
        const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
        expect(request.seat).toBe(seat);
        expect(
          setup.engine.applyIntent(seat, await policy.answerDecision(buildBotView(setup.state, seat), request)),
        ).toEqual({ ok: true });
      }
      await settle(() => mainActionReady(setup.engine));
      expect(mainActionReady(setup.engine)).toBe(true);
      expect(setup.state.pendingDecision).toBeUndefined();
      const windows = [...groups.values()];
      expect(windows.map((window) => window.actions.map((action) => action.sourceId))).toEqual(
        noEligible ? [] : soundbird ? [ids, ids.slice(0, 2).filter((id) => id !== ids[picks[0]!])] : [ids.slice(0, 2)],
      );
      for (const window of [...windows, ...orders])
        expect(
          window.observation.revealed.map(({ instanceId, cardId: revealedCardId }) => ({
            instanceId,
            cardId: revealedCardId,
          })),
        ).toEqual(ids.map((instanceId, index) => ({ instanceId, cardId: revealCards[index] })));
      expect(JSON.stringify([...windows, ...orders])).not.toContain(hidden);
      expect(orders.map((window) => window.actions.map((action) => action.sourceId))).toEqual(
        noEligible && soundbird ? [ids, ids.slice(0, 2), ids.slice(0, 1)] : [],
      );
      const picked = picks.map((index) => ids[index]);
      const remainder = ids.filter((id) => !picked.includes(id));
      expect(setup.state.players[seat]!.hand.map((card) => card.instanceId)).toEqual(picked);
      expect(setup.state.players[seat]!.deck.map((card) => card.instanceId)).toEqual([
        hidden,
        ...(soundbird ? (noEligible ? [...remainder].reverse() : remainder) : []),
      ]);
      expect(setup.state.players[seat]!.trash.map((card) => card.instanceId)).toEqual(soundbird ? [] : remainder);
      expect(setup.state.players[seat]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual([sourceId]);
      expect(setup.state.memory).toBe(10 - (security ? 0 : getCardDefinition(cardId)!.playCost));
      expect(setup.engine.combat.isAttacking).toBe(false);
      expect(setup.state.players[seat]!.security.map((card) => card.instanceId)).toEqual(
        security ? [setup.inst("security-tail").instanceId] : [],
      );
      expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
    },
  );
});
