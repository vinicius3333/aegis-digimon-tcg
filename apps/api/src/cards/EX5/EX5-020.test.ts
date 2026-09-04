import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX5-020.js";
import "../index.js";

describe("EX5-020 Crescemon", () => {
  it("reduces both play and into-this-card digivolution cost by two with a qualifying stacked Digimon", () => {
    const replacements = compiled.effects?.find((entry) => entry.trigger === "Static")?.actions;
    expect(replacements).toMatchObject([
      {
        kind: "Replacement",
        event: "wouldBePlayed",
        actions: [
          {
            kind: "Replacement",
            event: "wouldBePlayed",
            mode: "reduceCost",
            amount: 2,
            condition: { kind: "youHave" },
          },
        ],
      },
      {
        kind: "Replacement",
        event: "wouldDigivolve",
        actions: [
          {
            kind: "Replacement",
            event: "wouldDigivolve",
            mode: "reduceCost",
            amount: 2,
            condition: { kind: "youHave" },
          },
        ],
      },
    ]);
  });
  it("restricts one opposing Digimon from suspending on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Restrict",
      restriction: "suspend",
      target: { filter: { controller: "opponent" } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Restrict",
      restriction: "suspend",
      duration: "untilOpponentTurnEnd",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
  });
  it("grants itself 2000 DP during the opponent's turn when inherited", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent", target: { filter: { isSelfRef: true } } }],
    });
  });

  it("reduces play cost by two with a three-card Night Claw stack and restricts one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-017", as: "support", under: ["BT1-009", "BT1-010", "BT1-011"] }],
          hand: [{ card: "EX5-020", as: "crescemon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crescemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX5-020"));

    expect(s.state.memory).toBe(2);
    expect(observe(s.engine).isRestricted(s.perm("first"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("second"), "suspend")).toBe(false);
  });

  it("does not reduce play cost when the supporting stack has only two cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX5-017", as: "support", under: ["BT1-009", "BT1-010"] }],
        hand: [{ card: "EX5-020", as: "crescemon" }],
      },
    });
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crescemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX5-020"));

    expect(s.state.memory).toBe(0);
  });

  it("reduces digivolution cost by two when digivolving into Crescemon with the qualifying stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX5-017", as: "base", under: ["BT1-009", "BT1-010", "BT1-011"] }],
        hand: [{ card: "EX5-020", as: "crescemon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("crescemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-020");

    expect(s.state.memory).toBe(2);
  });

  it("applies the inherited DP bonus only on the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-020"] }] } });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5_000);

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(3_000);
  });

  it("does not reduce digivolution cost without the three-card support stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX5-017", as: "base" }],
        hand: [{ card: "EX5-020", as: "crescemon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("crescemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-020");

    expect(s.state.memory).toBe(0);
  });
});
