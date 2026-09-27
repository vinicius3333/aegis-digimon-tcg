import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

describe("BT26-026 paid Option during attack through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      [-1, 0, 1, 2].flatMap((payment) =>
        [0, 1].flatMap((copy) =>
          [0, 1].flatMap((target) =>
            (payment < 0 ? [false] : [false, true]).map((useOption) => ({ seat, payment, copy, target, useOption })),
          ),
        ),
      ),
    ),
  )(
    "seat=$seat payment=$payment copy=$copy target=$target use=$useOption",
    async ({ seat, payment, copy, target, useOption }) => {
      const opponent = seat === 0 ? 1 : 0;
      const setup = setupEngine({
        [seat]: {
          battleArea: [
            { card: "BT26-026", as: "attacker", dp: 30000 },
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
            { card: "BT26-031", as: "option-0" },
            { card: "BT26-031", as: "option-1" },
            { card: "ST23-12", as: "digimon" },
          ],
          security: [{ card: "EX9-046", as: "security" }],
          deck: [{ card: "EX9-048", as: "deck" }],
        },
        [opponent]: {
          battleArea: [0, 1].map((index) => ({ card: "EX9-055", as: `target-${index}`, suspended: true, dp: 20000 })),
          breeding: { card: "EX9-005", as: "breeding" },
        },
      });
      setup.state.turnSeat = seat;
      setup.state.memory = 10;
      await setup.ready();
      const attacker = setup.perm("attacker");
      const targets = [0, 1].map((index) => setup.perm(`target-${index}`));
      const tamerIds = [0, 1].map((index) => setup.inst(`tamer-${index}`).instanceId);
      const optionIds = [0, 1].map((index) => setup.inst(`option-${index}`).instanceId);
      const modals: TrainingWindow[] = [];
      let choices = 0;
      let artsChoices = 0;
      const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
        await Promise.resolve();
        if (window.kind === "main")
          return window.actions.findIndex(
            ({ intent }) =>
              intent.type === "attack" &&
              intent.attackerPermanentId === attacker.permanentId &&
              intent.target.kind === "permanent" &&
              intent.target.permanentId === targets[0]!.permanentId,
          );
        if (window.kind === "optional") return window.request?.sourceCardId === "BT26-026" && useOption ? 0 : 1; // Decline the Option's separate extra security-trash cost.
        if (window.kind === "chooseOption") {
          modals.push(window);
          expect(window.actions).toHaveLength(3);
          expect(window.actions.slice(0, 2).map((action) => action.label)).toEqual([
            "Trash the bottom face-down card from under 1 of your Tamers",
            "Trash your top security card",
          ]);
          return payment < 0 ? 2 : payment === 2 ? 1 : 0;
        }
        if (window.selected.length) return window.actions.findIndex((action) => action.label === "Finish selection");
        const offered = window.actions.flatMap((action) => (action.sourceId === undefined ? [] : [action.sourceId]));
        if (offered.some((id) => tamerIds.includes(id))) {
          expect(offered).toEqual(tamerIds);
          return window.actions.findIndex((action) => action.sourceId === tamerIds[payment]);
        }
        if (offered.some((id) => optionIds.includes(id))) {
          choices++;
          expect(offered).toEqual(optionIds);
          return window.actions.findIndex((action) => action.sourceId === optionIds[copy]);
        }
        if (window.request?.promptText.startsWith("＜Arts Digivolve＞")) {
          artsChoices++;
          expect(offered).toEqual([setup.inst("attacker").instanceId]);
          return window.actions.findIndex((action) => action.label === "Finish selection");
        }
        expect(offered).toEqual(targets.map((unit) => unit.permanentId));
        return window.actions.findIndex((action) => action.sourceId === targets[target]!.permanentId);
      });
      expect(setup.engine.applyIntent(seat, await policy.chooseMainAction(buildBotView(setup.state, seat)!))).toEqual({
        ok: true,
      });
      for (let step = 0; step < 20; step++) {
        await settle(() => setup.state.pendingDecision !== undefined || mainActionReady(setup.engine));
        const pending = setup.state.pendingDecision;
        if (pending === undefined) break;
        const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
        expect(request.seat).toBe(seat);
        expect(
          setup.engine.applyIntent(seat, await policy.answerDecision(buildBotView(setup.state, seat), request)),
        ).toEqual({ ok: true });
      }
      expect(mainActionReady(setup.engine)).toBe(true);
      expect(setup.state.pendingDecision).toBeUndefined();
      expect(setup.engine.combat.isAttacking).toBe(false);
      expect(modals).toHaveLength(1);
      expect(choices).toBe(useOption ? 1 : 0);
      expect(artsChoices).toBe(useOption ? 1 : 0);
      expect(setup.state.memory).toBe(10 - (useOption ? Math.max(0, getCardDefinition("BT26-031")!.playCost - 2) : 0));
      expect(setup.state.players[seat]!.hand.map((item) => item.instanceId)).toEqual([
        ...optionIds.filter((_, index) => !useOption || index !== copy),
        setup.inst("digimon").instanceId,
      ]);
      expect(setup.state.players[seat]!.security.map((item) => item.instanceId)).toEqual(
        payment === 2 ? [] : [setup.inst("security").instanceId],
      );
      expect(setup.state.players[seat]!.deck.map((item) => item.instanceId)).toEqual([setup.inst("deck").instanceId]);
      expect(setup.state.players[seat]!.trash.map((item) => item.instanceId)).toEqual(
        payment < 0
          ? []
          : [
              setup.inst(payment === 2 ? "security" : `bottom-${payment}`).instanceId,
              ...(useOption ? [optionIds[copy]] : []),
            ],
      );
      for (const index of [0, 1]) {
        expect(setup.perm(`tamer-${index}`).stack.map((item) => item.instanceId)).toEqual(
          [`visible-${index}`, ...(payment === index ? [] : [`bottom-${index}`]), `next-${index}`].map(
            (alias) => setup.inst(alias).instanceId,
          ),
        );
        expect(targets[index]!.currentDP).toBe(useOption && index === target ? 12000 : 20000);
      }
      expect(attacker.isSuspended).toBe(true);
      expect(setup.state.players[opponent]!.battleArea.map((unit) => unit.permanentId)).toEqual([
        targets[1]!.permanentId,
      ]);
      expect(setup.state.players[opponent]!.trash.map((item) => item.instanceId)).toEqual([
        setup.inst("target-0").instanceId,
      ]);
      expect(
        setup.events.filter((event) => event.kind === "actionRejected" || event.kind === "securityChecked"),
      ).toEqual([]);
    },
  );
});
