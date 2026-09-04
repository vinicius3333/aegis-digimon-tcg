import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX8-074.js";

describe("EX8-074", () => {
  it("reduces its play cost by 4 by suspending 2 Digimon and has Alliance and Vortex", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      actions: [{ mode: "reduceCost", amount: 4, cost: { kind: "suspend", target: { count: 2 } } }],
    });
    expect(
      compiled.effects?.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords ?? []),
    ).toEqual(
      expect.arrayContaining([
        { keyword: "Alliance", raw: "＜Alliance＞" },
        { keyword: "Vortex", raw: "＜Vortex＞" },
      ]),
    );
  });
  it("suspends a Digimon, deletes an opposing Digimon up to 8000 DP, and reactivates its own effect once per turn", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "Suspend", optional: true });
    expect(actions[1]).toMatchObject({
      kind: "CostModifier",
      mode: "raiseCeiling",
      costType: "dpDeletion",
      amount: 3000,
      scaling: {
        per: 1,
        unit: "cards",
        filter: { controllerDefault: "both", excludeSelf: true, suspended: true, kind: ["Digimon"] },
      },
    });
    expect(actions[2]).toMatchObject({
      kind: "Delete",
      optional: true,
      target: { filter: { controller: "opponent", dp: { op: "lte", value: 8000 } } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controllerDefault: "both", kind: ["Digimon"] },
      actions: [
        {
          kind: "ActivateEffect",
          effectType: "WhenDigivolving",
          optional: true,
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        },
      ],
    });
  });

  it("exposes Alliance and Vortex on the live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-074", as: "medieval" }] } });
    await (s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("medieval"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("medieval"), "Vortex")).toBe(true);
  });

  it("plays for 4 less by suspending two Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-047", as: "first" },
            { card: "EX8-048", as: "second" },
          ],
          hand: [{ card: "EX8-074", as: "medieval" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("medieval").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX8-074"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(true);
  });

  it("leaves the card unplayed when the reduced cost remains unaffordable", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-047", as: "only" }],
        hand: [{ card: "EX8-074", as: "medieval" }],
      },
    });
    s.state.memory = -10;
    s.state.turnSeat = 0;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("medieval").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("medieval").instanceId)).toBe(true);
    expect(s.perm("only").isSuspended).toBe(false);
  });

  it("reactivates its When Digivolving effect only once when Digimon are played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-074", as: "medieval" }],
          hand: [
            { card: "EX8-047", as: "first-play" },
            { card: "EX8-048", as: "second-play" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first-target", dp: 8000 },
            { card: "BT1-011", as: "second-target", dp: 8000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first-play").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second-play").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("raises the deletion ceiling before choosing a target for each other suspended Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-074", as: "medieval" },
            { card: "AD1-001", as: "first-suspended", suspended: true },
            { card: "BT1-010", as: "second-suspended", suspended: true },
          ],
        },
        1: { battleArea: [{ card: "AD1-001", as: "14000-dp-target", dp: 14000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("medieval"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "AD1-001")).toBe(true);
  });
});
