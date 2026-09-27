import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

const effects = [
  ...[-1, 0, 1].map((target) => ({ card: "BT25-049", target, security: 1 })),
  ...[0, 1, 2].map((security) => ({ card: "ST23-03", target: -1, security })),
];

describe("early Glowing Dawn entry effects through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      ["play", "digivolve"].flatMap((entry) => effects.map((effect) => ({ seat, entry, ...effect }))),
    ),
  )(
    "seat=$seat entry=$entry card=$card target=$target security=$security",
    async ({ seat, entry, card, target, security }) => {
      const opponent = seat === 0 ? 1 : 0;
      const securityCards = [
        { card: "BT25-043", as: "security-0" },
        { card: "ST23-12", as: "security-1" },
      ].slice(0, security);
      const setup = setupEngine({
        [seat]: {
          battleArea: [{ card: "BT25-032", as: "host" }],
          hand: [{ card, as: "source" }],
          security: securityCards,
          deck: [
            ...(entry === "digivolve" ? [{ card: "EX9-046", as: "draw" }] : []),
            { card: "BT25-020", as: "recovery" },
            { card: "EX9-048", as: "tail" },
          ],
        },
        [opponent]: {
          battleArea: [
            { card: "EX9-048", as: "target-0" },
            { card: "EX9-048", as: "target-1" },
            { card: "ST23-13", as: "tamer" },
          ],
          breeding: { card: "EX9-048", as: "breeding", under: ["EX9-005"] },
        },
      });
      setup.state.turnSeat = seat;
      setup.state.memory = 10;
      await setup.ready();
      const targetIds = [0, 1].map((index) => setup.perm(`target-${index}`).permanentId);
      const windows: TrainingWindow[] = [];
      const optionals: TrainingWindow[] = [];
      const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
        await Promise.resolve();
        if (window.kind === "main")
          return window.actions.findIndex(({ intent }) =>
            entry === "play"
              ? intent.type === "playCard" && intent.instanceId === setup.inst("source").instanceId
              : intent.type === "digivolve" &&
                intent.instanceId === setup.inst("source").instanceId &&
                intent.permanentId === setup.perm("host").permanentId &&
                intent.alternateRequirementIndex === 0,
          );
        expect(window.request?.sourceCardId).toBe("BT25-049");
        if (window.kind === "optional") {
          optionals.push(window);
          return target < 0 ? 1 : 0;
        }
        windows.push(window);
        return window.actions.findIndex((action) =>
          window.selected.length > 0 ? action.label === "Finish selection" : action.sourceId === targetIds[target],
        );
      });
      expect(setup.engine.applyIntent(seat, await policy.chooseMainAction(buildBotView(setup.state, seat)!))).toEqual({
        ok: true,
      });
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
      expect(optionals).toHaveLength(card === "BT25-049" ? 1 : 0);
      expect(windows).toHaveLength(target < 0 ? 0 : 2);
      expect(windows[0]?.actions.map((action) => action.sourceId)).toEqual(target < 0 ? undefined : targetIds);
      for (const index of [0, 1]) expect(setup.perm(`target-${index}`).isSuspended).toBe(index === target);
      expect(setup.perm("tamer").isSuspended).toBe(false);
      expect(setup.perm("breeding").isSuspended).toBe(false);
      const swapsSecurity = card === "ST23-03";
      expect(setup.state.players[seat]!.hand.map((item) => item.instanceId)).toEqual([
        ...(entry === "digivolve" ? [setup.inst("draw").instanceId] : []),
        ...(swapsSecurity && security > 0 ? [setup.inst("security-0").instanceId] : []),
      ]);
      expect(setup.state.players[seat]!.security.map((item) => item.instanceId)).toEqual([
        ...(swapsSecurity ? [setup.inst("recovery").instanceId] : []),
        ...securityCards.slice(swapsSecurity ? 1 : 0).map(({ as }) => setup.inst(as).instanceId),
      ]);
      expect(setup.state.players[seat]!.deck.map((item) => item.instanceId)).toEqual([
        ...(swapsSecurity ? [] : [setup.inst("recovery").instanceId]),
        setup.inst("tail").instanceId,
      ]);
      const played = setup.state.players[seat]!.battleArea.find(
        (unit) => unit.topCard.instanceId === setup.inst("source").instanceId,
      )!;
      expect(played).toBeDefined();
      expect(played.stack.map((item) => item.instanceId)).toEqual(
        entry === "digivolve" ? [setup.inst("host").instanceId] : [],
      );
      expect(setup.state.players[seat]!.battleArea).toHaveLength(entry === "play" ? 2 : 1);
      expect(played.isSuspended).toBe(false);
      expect(setup.state.memory).toBe(10 - (entry === "digivolve" ? 2 : getCardDefinition(card)!.playCost));
      expect(setup.state.players[seat]!.trash).toHaveLength(0);
      expect(setup.state.players[opponent]!.trash).toHaveLength(0);
      expect(mainActionReady(setup.engine)).toBe(true);
      expect(setup.state.pendingDecision).toBeUndefined();
      expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
    },
  );
});
