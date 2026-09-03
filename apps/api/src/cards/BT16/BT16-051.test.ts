import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-051.js";
import "../index.js";

function primitivesOf(setup: ReturnType<typeof setupEngine>): Primitives {
  return (setup.engine as unknown as { primitives: Primitives }).primitives;
}

describe("BT16-051", () => {
  it("places Kosuke Kisakata from hand under itself for leave/deletion protection", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GrantStatic",
          grant: "cantLeaveExceptByOwnerOrDeletion",
          duration: "untilOpponentTurnEnd",
          optional: true,
          abortOnDecline: true,
          cost: { kind: "place", destination: "digivolutionStack", position: "bottom", host: "self" },
        },
      ],
    });
  });

  it("has inherited permanent DP", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    });
  });

  it("gives a natural host +1000 DP from its inherited effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-019", as: "host", under: ["BT16-051"] }] } });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("places Kosuke underneath and blocks every Q2642 non-deletion exit while allowing deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-051", as: "dorumon" },
            { card: "BT1-086", as: "destination" },
          ],
          hand: [{ card: "BT16-087", as: "kosuke" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("dorumon"));

    expect(s.perm("dorumon").stack.at(-1)?.cardId).toBe("BT16-087");
    expect(observe(s.engine).isRestricted(s.perm("dorumon"), "leaveBattleAreaExceptByDeletion")).toBe(true);

    const dorumonPermanentId = s.perm("dorumon").permanentId;
    const topInstanceId = s.perm("dorumon").topCard!.instanceId;
    await advance(s.engine).verb.returnToHand([topInstanceId]);
    await advance(s.engine).verb.returnToDeck([topInstanceId]);
    await primitivesOf(s).addSecurity(0, [topInstanceId]);
    expect(primitivesOf(s).relocatePermanent(s.perm("destination").permanentId, dorumonPermanentId)).toBe(false);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === dorumonPermanentId)).toBe(true);
    expect(await advance(s.engine).verb.deletePermanent([dorumonPermanentId])).toBe(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === dorumonPermanentId)).toBe(
      false,
    );
  });

  it("stops a natural opponent On Play effect from returning it to the deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-051", as: "dorumon" }],
          hand: [{ card: "BT16-087", as: "kosuke" }],
        },
        1: { hand: [{ card: "BT16-023", as: "divemon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const dorumonPermanentId = s.perm("dorumon").permanentId;
    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("dorumon"));

    s.state.turnSeat = 1;
    s.state.memory = 6;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("divemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 50);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === dorumonPermanentId)).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT16-051")).toBe(false);
  });

  it("still leaves through the normal zero-DP rule process required by Q2643", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-051", as: "dorumon" }],
          hand: [{ card: "BT16-087", as: "kosuke" }],
        },
        1: { hand: [{ card: "BT1-055", as: "angemon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const dorumonPermanentId = s.perm("dorumon").permanentId;
    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("dorumon"));

    s.state.turnSeat = 1;
    s.state.memory = 5;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("angemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === dorumonPermanentId),
    );

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT16-051")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT16-087")).toBe(true);
  });
});
