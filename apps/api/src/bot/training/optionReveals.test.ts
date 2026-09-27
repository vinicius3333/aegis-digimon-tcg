import { getCardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady, mainActions } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

const paths = ([0, 1] as const).flatMap((seat) => [
  ...([0, 1] as const).flatMap((pick) =>
    [false, true].map((reverse) => ({ seat, card: "LM-033", security: false, pick, reverse, eligible: true })),
  ),
  ...[false, true].flatMap((security) =>
    [0, 1].map((pick) => ({ seat, card: "LM-054", security, pick, reverse: false, eligible: true })),
  ),
  { seat, card: "LM-033", security: true, pick: -1, reverse: false, eligible: false },
  { seat, card: "LM-033", security: false, pick: -1, reverse: true, eligible: false },
  ...[false, true].map((security) => ({ seat, card: "LM-054", security, pick: -1, reverse: true, eligible: false })),
]);

describe("Garnet and Treadmill reveals through the asynchronous policy", () => {
  it.each(paths)(
    "seat=$seat card=$card security=$security pick=$pick reverse=$reverse eligible=$eligible",
    async ({ seat, card, security, pick, reverse, eligible }) => {
      const opponent: Seat = seat === 0 ? 1 : 0;
      const revealedCards =
        card === "LM-033"
          ? eligible
            ? ["EX9-046", "BT25-020", "BT6-090"]
            : ["BT6-090", "BT25-032", "LM-031"]
          : eligible
            ? ["BT6-090", "LM-031"]
            : ["BT25-020", "EX8-074"];
      const option = { card, as: "option" };
      const setup = setupEngine(
        {
          [seat]: {
            ...(security ? { security: [option] } : { hand: [option] }),
            battleArea: [{ card: "EX9-046", as: "anchor" }],
            deck: [
              ...revealedCards.map((id, index) => ({ card: id, as: `reveal-${index}` })),
              { card: "EX9-048", as: "tail" },
            ],
          },
          [opponent]: { battleArea: security ? [{ card: "EX9-046", as: "attacker" }] : [] },
        },
        { autoOrderCards: false, autoOrderTriggers: false },
      );
      setup.state.turnSeat = security ? opponent : seat;
      setup.state.memory = 10;
      await setup.ready();
      const optionId = setup.inst("option").instanceId;
      const revealIds = revealedCards.map((_, index) => setup.inst(`reveal-${index}`).instanceId);
      const tailId = setup.inst("tail").instanceId;
      const doesReveal = card === "LM-054" || !security;
      const remainder = revealIds.filter((_, index) => index !== pick);
      const bottom = reverse ? [...remainder].reverse() : remainder;
      const windows: TrainingWindow[] = [];
      const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
        await Promise.resolve();
        windows.push(window);
        if (window.kind === "main")
          return window.actions.findIndex(({ intent }) => intent.type === "playCard" && intent.instanceId === optionId);
        const block = window.actions.findIndex(({ intent }) => intent.type === "declineBlock");
        if (block >= 0) return block;
        if (window.kind === "orderCards")
          return window.actions.findIndex((action) => action.sourceId === bottom[window.selected.length]);
        if (window.selected.length > 0)
          return window.actions.findIndex((action) => action.label === "Finish selection");
        return window.actions.findIndex((action) => action.sourceId === revealIds[pick]);
      });
      const attacker = createAsyncTrainingPolicy(setup.engine, opponent, async (window) => {
        await Promise.resolve();
        return window.actions.findIndex(({ intent }) => intent.type === "attack" && intent.target.kind === "player");
      });
      const actingSeat = security ? opponent : seat;
      const actor = security ? attacker : policy;
      expect(
        setup.engine.applyIntent(actingSeat, await actor.chooseMainAction(buildBotView(setup.state, actingSeat)!)),
      ).toEqual({ ok: true });
      let answeredBlock = false;
      for (let step = 0; step < 24; step++) {
        await settle();
        const pending = setup.state.pendingDecision;
        if (pending) {
          const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
          expect(request.seat).toBe(seat);
          expect(
            setup.engine.applyIntent(seat, await policy.answerDecision(buildBotView(setup.state, seat), request)),
          ).toEqual({ ok: true });
          continue;
        }
        const block = setup.events.find((event) => event.kind === "blockWindowOpened");
        if (block?.kind === "blockWindowOpened" && !answeredBlock) {
          answeredBlock = true;
          expect(
            setup.engine.applyIntent(
              seat,
              await policy.chooseBlockResponse(buildBotView(setup.state, seat)!, {
                ...block,
                mustBlock: block.mustBlock ?? false,
                targetsPlayer: true,
              }),
            ),
          ).toEqual({ ok: true });
          continue;
        }
        if (mainActionReady(setup.engine)) break;
      }
      await settle(() => mainActionReady(setup.engine));
      expect(mainActionReady(setup.engine)).toBe(true);
      expect(setup.engine.combat.isAttacking).toBe(false);
      expect(setup.state.pendingDecision).toBeUndefined();
      expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
      expect(setup.events.filter((event) => event.kind === "securityRevealed")).toHaveLength(security ? 1 : 0);
      const selections = windows.filter((window) => window.kind === "selectCards" && window.selected.length === 0);
      expect(selections.map((window) => window.actions.map((action) => action.sourceId))).toEqual(
        eligible ? [revealIds.slice(0, 2)] : [],
      );
      const orders = windows.filter((window) => window.kind === "orderCards");
      expect(orders.map((window) => window.actions.map((action) => action.sourceId))).toEqual(
        doesReveal && bottom.length > 1
          ? bottom.map((_, index) => remainder.filter((id) => !bottom.slice(0, index).includes(id)))
          : [],
      );
      for (const window of [...selections, ...orders]) {
        expect(window.request?.sourceCardId).toBe(card);
        expect(window.observation.revealed.map(({ instanceId, cardId }) => ({ instanceId, cardId }))).toEqual(
          revealIds
            .map((instanceId, index) => ({ instanceId, cardId: revealedCards[index] }))
            .filter((entry) => window.kind !== "orderCards" || remainder.includes(entry.instanceId)),
        );
        expect(JSON.stringify(window.observation)).not.toContain(tailId);
      }
      expect(setup.state.players[seat]!.hand.map((instance) => instance.instanceId)).toEqual(
        pick < 0 ? [] : [revealIds[pick]],
      );
      expect(setup.state.players[seat]!.deck.map((instance) => instance.instanceId)).toEqual(
        doesReveal ? [tailId, ...bottom] : [...revealIds, tailId],
      );
      expect(setup.state.players[seat]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual([
        setup.inst("anchor").instanceId,
        optionId,
      ]);
      expect(setup.state.players[seat]!.trash).toHaveLength(0);
      expect(setup.state.players[seat]!.security).toHaveLength(0);
      expect(setup.state.memory).toBe(10 - (security ? 0 : getCardDefinition(card)!.playCost));
      expect(setup.state.players[opponent]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual(
        security ? [setup.inst("attacker").instanceId] : [],
      );
      // Main placement cannot immediately pay Delay. Security's next-turn eligibility is separate.
      expect(
        mainActions(setup.engine, actingSeat).some(
          ({ intent }) => intent.type === "activateEffect" && intent.sourceInstanceId === optionId,
        ),
      ).toBe(false);
    },
  );
});
