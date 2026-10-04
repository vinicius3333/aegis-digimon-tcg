import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { mainActions } from "./actions.js";
import "../../cards/index.js";

describe("Yuugo deferred play affordability", () => {
  it.each([0, 1] as const)("seat %i excludes a cost-15 play when the only reduction is two", async (seat) => {
    const setup = setupEngine({
      [seat]: {
        hand: [{ card: "BT22-015", as: "played" }],
        battleArea: [{ card: "BT22-094", as: "yuugo" }],
      },
    });
    setup.state.turnSeat = seat;
    setup.state.memory = 2;
    await setup.ready();
    const intent = { type: "playCard" as const, instanceId: setup.inst("played").instanceId };
    const before = setup.state.toJSON();
    expect(mainActions(setup.engine, seat).map((action) => action.intent)).not.toContainEqual(intent);
    expect(setup.engine.applyIntent(seat, intent)).toEqual({ ok: false, reason: "insufficient-memory" });
    expect(setup.state.toJSON()).toEqual(before);
    expect(setup.decisions).toEqual([]);
  });

  it.each(([0, 1] as const).flatMap((seat) => [1, 2].map((copies) => ({ seat, copies }))))(
    "seat=$seat pays the exact affordable boundary with $copies independent return sources",
    async ({ seat, copies }) => {
      const setup = setupEngine(
        {
          [seat]: {
            hand: [{ card: "BT22-015", as: "played" }],
            battleArea: Array.from({ length: copies }, () => "BT22-094"),
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      setup.state.turnSeat = seat;
      setup.state.memory = copies === 1 ? 3 : 1;
      await setup.ready();
      const intent = { type: "playCard" as const, instanceId: setup.inst("played").instanceId };
      const before = setup.state.toJSON();
      expect(mainActions(setup.engine, seat).map((action) => action.intent)).toContainEqual(intent);
      expect(setup.state.toJSON()).toEqual(before);
      expect(setup.decisions).toEqual([]);
      expect(setup.engine.applyIntent(seat, intent)).toEqual({ ok: true });
      await settle(() => setup.engine.mainVerbContinuationsInFlight === 0);
      expect(setup.events).toContainEqual({
        kind: "memoryChanged",
        from: copies === 1 ? 3 : 1,
        to: -10,
        reason: "playCard",
      });
      expect(setup.state.players[seat]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual([intent.instanceId]);
      expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
    },
  );

  it.each(["memory", "enabledAfterReturn", "returnReaction", "passiveAfterReturn"] as const)(
    "preserves authoritative resolution for an unknown %s route",
    async (route) => {
      const options = { autoAcceptOptional: true, autoSelectCards: true, autoDeclineOptional: false };
      const setup = setupEngine(
        {
          0: {
            hand: [
              { card: "BT22-015", as: "played" },
              ...(route === "enabledAfterReturn" ? [{ card: "BT22-008", as: "earlier" }] : []),
            ],
            battleArea: [
              { card: "BT22-094", as: "yuugo" },
              { card: "BT6-090", as: "other" },
            ],
          },
        },
        options,
      );
      setup.state.memory = 2;
      await setup.ready();
      let earlierResult;
      if (route === "enabledAfterReturn") {
        // A prior ordinary play installs Yuugo's resident subscription. Declining
        // its discount keeps the source available before the later grant is armed.
        setup.state.memory = 5;
        options.autoAcceptOptional = false;
        options.autoDeclineOptional = true;
        earlierResult = setup.engine.applyIntent(0, { type: "playCard", instanceId: setup.inst("earlier").instanceId });
        await settle(() => setup.engine.mainVerbContinuationsInFlight === 0);
        options.autoAcceptOptional = true;
        options.autoDeclineOptional = false;
      }
      expect(earlierResult).toEqual(route === "enabledAfterReturn" ? { ok: true } : undefined);
      expect(setup.state.memory).toBe(2);
      let activations = 0;
      const sourceId = setup.perm(route === "returnReaction" ? "yuugo" : "other").permanentId;
      if (route === "returnReaction") {
        setup.engine.subTriggers.subscribe({
          event: "wouldBeReturned",
          sourcePermanentId: sourceId,
          once: false,
          description: "immediate return memory reaction",
          run: async (ctx) => {
            activations++;
            ctx.fx.gainMemory(1);
          },
        });
      } else if (route === "passiveAfterReturn") {
        setup.engine.subTriggers.subscribeReplacement({
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 0,
          description: "passive discount after the Tamer leaves",
          sourcePermanentId: sourceId,
          appliesTo: (target) => target.controllerSeat === 0,
          amountForInto: () => {
            activations++;
            return setup.state.players[0]!.battleArea.some(
              (unit) => unit.topCard.instanceId === setup.inst("yuugo").instanceId,
            )
              ? 0
              : 3;
          },
        });
      } else {
        setup.engine.subTriggers.subscribeReplacement({
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 0,
          description: "variable activation result",
          controllerSeat: 0,
          sourcePermanentId: sourceId,
          appliesTo: (target) =>
            target.controllerSeat === 0 &&
            (route !== "enabledAfterReturn" ||
              !setup.state.players[0]!.battleArea.some(
                (unit) => unit.topCard.instanceId === setup.inst("yuugo").instanceId,
              )),
          activate: async (ctx) => {
            activations++;
            if (route === "memory") ctx.fx.gainMemory(3);
            return route === "memory" ? 2 : 1;
          },
        });
      }
      const intent = { type: "playCard" as const, instanceId: setup.inst("played").instanceId };
      const before = setup.state.toJSON();
      expect(mainActions(setup.engine, 0).map((action) => action.intent)).toContainEqual(intent);
      expect(setup.state.toJSON()).toEqual(before);
      expect(activations).toBe(0);
      expect(setup.engine.applyIntent(0, intent)).toEqual({ ok: true });
      await settle(() => setup.engine.mainVerbContinuationsInFlight === 0);
      expect(activations).toBe(1);
      expect(setup.state.players[0]!.battleArea.map((unit) => unit.topCard.instanceId)).toContain(intent.instanceId);
      expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
    },
  );

  it("bounds duplicate hand-armed and resident installations by the same physical return source", async () => {
    const setup = setupEngine(
      {
        0: {
          hand: [
            { card: "BT22-015", as: "played" },
            { card: "BT22-094", as: "yuugo" },
          ],
          battleArea: [{ card: "BT22-008", as: "agumon", under: ["BT22-005"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    setup.state.memory = 5;
    await setup.ready();
    expect(setup.engine.applyIntent(0, { type: "playCard", instanceId: setup.inst("yuugo").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => setup.engine.mainVerbContinuationsInFlight === 0);
    expect(setup.state.memory).toBe(2);
    const before = setup.state.toJSON();
    const decisions = setup.decisions.length;
    const intent = { type: "playCard" as const, instanceId: setup.inst("played").instanceId };
    expect(mainActions(setup.engine, 0).map((action) => action.intent)).not.toContainEqual(intent);
    expect(setup.engine.applyIntent(0, intent)).toEqual({ ok: false, reason: "insufficient-memory" });
    expect(setup.state.toJSON()).toEqual(before);
    expect(setup.decisions).toHaveLength(decisions);
  });
});
