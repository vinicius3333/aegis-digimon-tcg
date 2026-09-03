import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-106.js";

describe("BT10-106 Justice Kick", () => {
  it("reduces its use cost by 1 for every Tamer in play without an artificial cap", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT10-087", "BT10-088", "BT10-089", "BT10-090", "BT10-091", "BT10-092", "BT10-093"],
          hand: [{ card: "BT10-106", as: "option" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    // Justice Kick costs 12; seven Tamers reduce that to 5.
    expect(s.state.memory).toBe(5);
  });

  it("floors the reduction at zero with more Tamers than the use cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            "BT10-087",
            "BT10-088",
            "BT10-089",
            "BT10-090",
            "BT10-091",
            "BT10-092",
            "BT10-093",
            "BT10-087",
            "BT10-088",
            "BT10-089",
            "BT10-090",
            "BT10-091",
            "BT10-092",
          ],
          hand: [{ card: "BT10-106", as: "option" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 0;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    // Justice Kick costs 12; thirteen Tamers reduce it to zero, never below zero.
    expect(s.state.memory).toBe(0);
  });

  it("counts only its controller's Tamers for the reduction", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT10-064", "BT10-087"], hand: [{ card: "BT10-106", as: "option" }] },
        1: { battleArea: ["BT10-088", "BT10-089", "BT10-090", "BT10-091"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    // Only the one own Tamer reduces Justice Kick's cost: 12 - 1 = 11.
    expect(s.state.memory).toBe(1);
  });

  it("does not count an originally own Tamer after control changes to the opponent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT10-064", { card: "BT10-087", as: "transferredTamer" }],
          hand: [{ card: "BT10-106", as: "option" }],
        },
        1: {},
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.perm("transferredTamer").controllerSeat = 1;
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    // The Tamer remains in the original owner's area but is controlled by the opponent, so it does not count.
    expect(s.state.memory).toBe(0);
  });

  it("returns itself after optionally playing a black Tamer from Security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT10-106", as: "option", faceUp: true }], hand: [{ card: "BT10-092", as: "tamer" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-092")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("deletes an opponent Digimon up to the play cost of the Justimon it played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT10-064"],
          hand: [
            { card: "BT10-106", as: "option" },
            { card: "BT10-067", as: "justimon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-011", as: "target" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard?.instanceId === s.inst("justimon").instanceId,
        ) && s.state.players[1]!.battleArea.length === 0,
    );

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not delete anything when no Justimon was played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT10-064"], hand: [{ card: "BT10-106", as: "option" }] },
        1: { battleArea: [{ card: "BT1-011", as: "target" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("target").topCard?.cardId).toBe("BT1-011");
  });

  it("does not delete anything when playing the available Justimon is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT10-064"],
          hand: [
            { card: "BT10-106", as: "option" },
            { card: "BT10-067", as: "justimon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-011", as: "target" }] },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("justimon").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
