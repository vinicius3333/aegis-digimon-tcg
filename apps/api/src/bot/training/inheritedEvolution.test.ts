import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

const paths = [
  { payer: -1, evolution: -1, route: 0 },
  ...[0, 1].flatMap((payer) => [
    { payer, evolution: 0, route: 0 },
    { payer, evolution: 1, route: 0 },
    { payer, evolution: 1, route: 1 },
  ]),
];

describe("Kekkomon inherited attack evolution through the asynchronous policy", () => {
  it.each(([0, 1] as const).flatMap((seat) => paths.map((path) => ({ seat, ...path }))))(
    "seat=$seat payer=$payer evolution=$evolution route=$route",
    async ({ seat, payer, evolution, route }) => {
      const opponent = seat === 0 ? 1 : 0;
      const setup = setupEngine({
        [seat]: {
          battleArea: [
            { card: "BT25-035", as: "attacker", under: [{ card: "ST23-01", as: "egg" }] },
            ...[0, 1].map((index) => ({
              card: "ST23-13",
              as: `tamer-${index}`,
              suspended: true,
              under: [
                { card: "ST23-06", as: `visible-${index}`, faceUp: true },
                { card: "BT25-032", as: `bottom-${index}`, faceUp: false },
                { card: "BT26-025", as: `next-${index}`, faceUp: false },
              ],
            })),
          ],
          hand: [
            { card: "BT25-057", as: "evolution-0" },
            { card: "BT26-031", as: "evolution-1" },
            { card: "EX9-055", as: "ineligible" },
          ],
          deck: [
            { card: "EX9-046", as: "draw" },
            { card: "EX9-048", as: "tail" },
          ],
        },
        [opponent]: { battleArea: [{ card: "EX9-048", as: "defender", suspended: true, dp: 1000 }] },
      });
      setup.state.turnSeat = seat;
      setup.state.memory = 10;
      await setup.ready();
      const attacker = setup.perm("attacker");
      const payerIds = [0, 1].map((index) => setup.inst(`tamer-${index}`).instanceId);
      const evolutionIds = [0, 1].map((index) => setup.inst(`evolution-${index}`).instanceId);
      const payments: TrainingWindow[] = [];
      const evolutions: TrainingWindow[] = [];
      const optionals: TrainingWindow[] = [];
      const modes: TrainingWindow[] = [];
      const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
        await Promise.resolve();
        if (window.kind === "main")
          return window.actions.findIndex(
            ({ intent }) =>
              intent.type === "attack" &&
              intent.attackerPermanentId === attacker.permanentId &&
              intent.target.kind === "permanent" &&
              intent.target.permanentId === setup.perm("defender").permanentId,
          );
        if (window.kind === "orderTriggers") return 0;
        if (window.request?.sourceCardId !== "ST23-01") {
          expect(["BT25-057", "BT26-031", undefined]).toContain(window.request?.sourceCardId);
          if (window.kind === "optional") return 1;
          return window.actions.findIndex((action) => action.label === "Finish selection");
        }
        if (window.kind === "optional") {
          optionals.push(window);
          return payer < 0 ? 1 : 0;
        }
        if (window.kind === "chooseOption") {
          modes.push(window);
          return route;
        }
        const payment =
          window.actions.some((action) => payerIds.includes(action.sourceId ?? "")) ||
          window.selected.some((id) => payerIds.includes(id));
        (payment ? payments : evolutions).push(window);
        return window.actions.findIndex((action) =>
          window.selected.length > 0
            ? action.label === "Finish selection"
            : action.sourceId === (payment ? payerIds[payer] : evolutionIds[evolution]),
        );
      });
      expect(setup.engine.applyIntent(seat, await policy.chooseMainAction(buildBotView(setup.state, seat)!))).toEqual({
        ok: true,
      });
      for (let step = 0; step < 24; step++) {
        await settle(() => setup.state.pendingDecision !== undefined || mainActionReady(setup.engine));
        const pending = setup.state.pendingDecision;
        if (!pending) break;
        const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
        expect(request.seat).toBe(seat);
        expect(
          setup.engine.applyIntent(seat, await policy.answerDecision(buildBotView(setup.state, seat), request)),
        ).toEqual({ ok: true });
      }
      expect(optionals).toHaveLength(1);
      expect(modes.map((window) => window.actions.map((action) => action.label))).toEqual(
        evolution === 1
          ? [["Printed digivolution requirement (cost 4)", "Alternate digivolution requirement (cost 3)"]]
          : [],
      );
      expect(payments).toHaveLength(payer < 0 ? 0 : 2);
      expect(payments[0]?.actions.map((action) => action.sourceId)).toEqual(payer < 0 ? undefined : payerIds);
      expect(evolutions).toHaveLength(payer < 0 ? 0 : 2);
      expect(evolutions[0]?.actions.map((action) => action.sourceId)).toEqual(payer < 0 ? undefined : evolutionIds);
      for (const index of [0, 1])
        expect(setup.perm(`tamer-${index}`).stack.map((card) => card.instanceId)).toEqual(
          [`visible-${index}`, ...(payer === index ? [] : [`bottom-${index}`]), `next-${index}`].map(
            (alias) => setup.inst(alias).instanceId,
          ),
        );
      expect(setup.state.players[seat]!.trash.map((card) => card.instanceId)).toEqual(
        payer < 0 ? [] : [setup.inst(`bottom-${payer}`).instanceId],
      );
      expect(attacker.topCard.instanceId).toBe(
        evolution < 0 ? setup.inst("attacker").instanceId : evolutionIds[evolution],
      );
      expect(attacker.stack.map((card) => card.instanceId)).toEqual([
        setup.inst("egg").instanceId,
        ...(evolution < 0 ? [] : [setup.inst("attacker").instanceId]),
      ]);
      expect(setup.state.players[seat]!.hand.map((card) => card.instanceId)).toEqual([
        ...evolutionIds.filter((_, index) => index !== evolution),
        setup.inst("ineligible").instanceId,
        ...(evolution < 0 ? [] : [setup.inst("draw").instanceId]),
      ]);
      expect(setup.state.players[seat]!.deck.map((card) => card.instanceId)).toEqual([
        ...(evolution < 0 ? [setup.inst("draw").instanceId] : []),
        setup.inst("tail").instanceId,
      ]);
      expect(setup.state.players[seat]!.security).toHaveLength(0);
      expect(setup.state.players[opponent]!.battleArea).toHaveLength(0);
      expect(setup.state.players[opponent]!.trash.map((card) => card.instanceId)).toEqual([
        setup.inst("defender").instanceId,
      ]);
      expect(setup.state.memory).toBe(evolution < 0 ? 10 : evolution === 1 && route === 0 ? 8 : 9);
      expect(attacker.isSuspended).toBe(true);
      expect(mainActionReady(setup.engine)).toBe(true);
      expect(setup.engine.combat.isAttacking).toBe(false);
      expect(setup.state.pendingDecision).toBeUndefined();
      expect(setup.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(1);
      expect(
        setup.events.filter((event) => event.kind === "actionRejected" || event.kind === "securityRevealed"),
      ).toEqual([]);
    },
  );
});
