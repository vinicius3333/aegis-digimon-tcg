import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy } from "./policy.js";
import "../../cards/index.js";

const routes = [{ payer: -1, mode: -1 }, ...[0, 1].flatMap((payer) => [0, 1].map((mode) => ({ payer, mode })))];

describe("ST23-04 paid play/use through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      (["play", "evolve"] as const).flatMap((entry) =>
        routes.flatMap((route) =>
          [0, 1].flatMap((target) => [0, 1].map((optionTarget) => ({ seat, entry, ...route, target, optionTarget }))),
        ),
      ),
    ),
  )(
    "seat=$seat entry=$entry payer=$payer mode=$mode target=$target optionTarget=$optionTarget",
    async ({ seat, entry, payer, mode, target, optionTarget }) => {
      const setup = setupEngine({
        [seat]: {
          battleArea: [
            ...(entry === "evolve" ? [{ card: "BT26-026", as: "base" }] : []),
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
            { card: "ST23-04", as: "source" },
            { card: "BT26-089", as: "played" },
            { card: "BT26-031", as: "option" },
            { card: "ST23-12", as: "other" },
          ],
          deck: [
            { card: "EX9-046", as: "draw" },
            { card: "EX9-048", as: "tail" },
          ],
          security: [{ card: "EX9-047", as: "security" }],
        },
        [1 - seat]: {
          battleArea: [0, 1].map((index) => ({ card: "EX9-055", as: `target-${index}`, dp: 30000 })),
          breeding: { card: "EX9-005", as: "breeding" },
        },
      });
      setup.state.turnSeat = seat;
      setup.state.memory = 10;
      await setup.ready();
      const targetIds = [0, 1].map((index) => setup.perm(`target-${index}`).permanentId);
      const tamerIds = [0, 1].map((index) => setup.inst(`tamer-${index}`).instanceId);
      let dpChoices = 0;
      let paid = 0;
      let selected = 0;
      const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
        await Promise.resolve();
        if (window.kind === "main")
          return window.actions.findIndex(({ intent }) =>
            entry === "play"
              ? intent.type === "playCard" && intent.instanceId === setup.inst("source").instanceId
              : intent.type === "digivolve" &&
                intent.instanceId === setup.inst("source").instanceId &&
                intent.alternateRequirementIndex === 0,
          );
        if (window.kind === "optional") return window.request?.sourceCardId === "ST23-04" && payer >= 0 ? 0 : 1;
        if (window.kind === "chooseOption") return mode;
        if (window.selected.length) return window.actions.findIndex((action) => action.label === "Finish selection");
        const ids = window.actions.flatMap((action) => (action.sourceId === undefined ? [] : [action.sourceId]));
        if (ids.some((id) => targetIds.includes(id))) {
          expect(ids).toEqual(targetIds);
          const chosen = dpChoices++ === 0 ? target : optionTarget;
          return window.actions.findIndex((action) => action.sourceId === targetIds[chosen]);
        }
        if (ids.some((id) => tamerIds.includes(id))) {
          expect(ids).toEqual(tamerIds);
          if (payer < 0) return window.actions.findIndex((action) => action.label === "Finish selection");
          paid++;
          return window.actions.findIndex((action) => action.sourceId === tamerIds[payer]);
        }
        expect(ids).toEqual(["played", "option", "other"].map((alias) => setup.inst(alias).instanceId));
        selected++;
        const wanted = setup.inst(mode === 0 ? "played" : "option").instanceId;
        const index = window.actions.findIndex((action) => action.sourceId === wanted);
        if (index < 0) throw new Error(`Unexpected nested card selection: ${JSON.stringify(window.actions)}`);
        return index;
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
      expect(mainActionReady(setup.engine)).toBe(true);
      expect(setup.state.pendingDecision).toBeUndefined();
      expect(paid).toBe(payer < 0 ? 0 : 1);
      expect(selected).toBe(payer < 0 ? 0 : 1);
      expect(dpChoices).toBe(mode === 1 ? 2 : 1);
      const source = setup.state.players[seat]!.battleArea.find(
        (unit) => unit.topCard.instanceId === setup.inst("source").instanceId,
      )!;
      expect(source).toBeDefined();
      expect(source.stack.map((item) => item.instanceId)).toEqual(
        entry === "evolve" ? [setup.inst("base").instanceId] : [],
      );
      expect(setup.state.memory).toBe(
        10 -
          (entry === "evolve" ? 3 : getCardDefinition("ST23-04")!.playCost) -
          (mode < 0 ? 0 : Math.max(0, getCardDefinition(mode === 0 ? "BT26-089" : "BT26-031")!.playCost - 3)),
      );
      expect(setup.state.players[seat]!.hand.map((item) => item.instanceId)).toEqual([
        ...(mode === 0 ? [] : [setup.inst("played").instanceId]),
        ...(mode === 1 ? [] : [setup.inst("option").instanceId]),
        setup.inst("other").instanceId,
        ...(entry === "evolve" ? [setup.inst("draw").instanceId] : []),
      ]);
      expect(setup.state.players[seat]!.deck.map((item) => item.instanceId)).toEqual(
        (entry === "evolve" ? ["tail"] : ["draw", "tail"]).map((alias) => setup.inst(alias).instanceId),
      );
      expect(setup.state.players[seat]!.security.map((item) => item.instanceId)).toEqual([
        setup.inst("security").instanceId,
      ]);
      expect(setup.state.players[seat]!.trash.map((item) => item.instanceId)).toEqual([
        ...(payer < 0 ? [] : [setup.inst(`bottom-${payer}`).instanceId]),
        ...(mode === 1 ? [setup.inst("option").instanceId] : []),
      ]);
      expect(
        setup.state.players[seat]!.battleArea.some(
          (unit) => unit.topCard.instanceId === setup.inst("played").instanceId,
        ),
      ).toBe(mode === 0);
      for (const index of [0, 1]) {
        expect(setup.perm(`target-${index}`).currentDP).toBe(
          30000 - (index === target ? 5000 : 0) - (mode === 1 && index === optionTarget ? 8000 : 0),
        );
        expect(setup.perm(`tamer-${index}`).stack.map((item) => item.instanceId)).toEqual(
          [`visible-${index}`, ...(payer === index ? [] : [`bottom-${index}`]), `next-${index}`].map(
            (alias) => setup.inst(alias).instanceId,
          ),
        );
      }
      expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
    },
  );
});
