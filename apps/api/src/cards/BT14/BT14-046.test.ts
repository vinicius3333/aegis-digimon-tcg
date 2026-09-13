import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../BT26/BT26-021.js";
import "../ST17/ST17-02.js";
import "../index.js";
import { compiled } from "./BT14-046.js";

describe("BT14-046", () => {
  it("registers the before-pay-cost suspend reduction and inherited green-Tamer evo reduction", () => {
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      amount: 3,
      sourceFilter: { zone: "hand" },
      cost: { kind: "suspend" },
    });
    expect(compiled.effects[1]).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Replacement", event: "wouldDigivolve", amount: 1 }],
    });
  });

  it("naturally reduces only the first qualifying green Tamer play by suspending a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-046", as: "togemon" },
            { card: "BT14-045", as: "other" },
          ],
          hand: [
            { card: "BT1-089", as: "firstMimi" },
            { card: "BT1-089", as: "secondMimi" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstMimi").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("firstMimi").instanceId) &&
        s.state.memory === 9,
    );
    expect(s.state.memory).toBe(9);
    expect(s.perm("togemon").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondMimi").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("secondMimi").instanceId) &&
        s.state.memory === 5,
    );
    expect(s.state.memory).toBe(5);
    expect(s.perm("other").isSuspended).toBe(false);
  });

  it("does not reduce a green Tamer played by an effect from the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-046", as: "togemon" },
            { card: "BT26-021", as: "gekomon" },
          ],
          trash: [{ card: "BT24-085", as: "tsTamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("gekomon").topCard.instanceId,
        effectKey: "BT26-021/main-play-ts-tamer-from-trash",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT24-085"));

    expect(s.state.memory).toBe(1);
    expect(s.perm("togemon").isSuspended).toBe(false);
  });

  it("reduces a green Tamer played by an effect from the hand without spending the reducer in preflight", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-046", as: "togemon" },
            { card: "ST17-02", as: "terriermon" },
          ],
          hand: [{ card: "BT1-089", as: "mimi" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("togemon").topCard.instanceId);
    s.state.memory = 10;

    const effects = JSON.parse(s.perm("terriermon").activatableEffectsJson) as Array<{ effectKey: string }>;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("terriermon").topCard.instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-089"));

    expect(s.state.memory).toBe(10);
    expect(s.perm("togemon").isSuspended).toBe(true);
  });

  it("naturally reduces an inherited host's evolution when a green Tamer is present", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT14-045", as: "host", under: ["BT14-046"] },
          { card: "BT1-089", as: "mimi" },
        ],
        hand: [{ card: "BT14-050", as: "piximon" }],
      },
    });
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("piximon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT14-050");
    expect(s.state.memory).toBe(8);
  });

  it("resets the green Tamer play reduction on the next natural turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-046", as: "togemon" },
            { card: "BT1-064", as: "other" },
          ],
          hand: [
            { card: "BT1-089", as: "firstMimi" },
            { card: "BT1-089", as: "secondMimi" },
            { card: "BT1-089", as: "thirdMimi" },
          ],
          deck: Array(8).fill("BT1-009"),
        },
        1: { hand: ["BT1-009"], deck: Array(8).fill("BT1-009") },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds },
    );
    s.state.memory = 10;
    preferInstanceIds.push(s.perm("togemon").topCard.instanceId);

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstMimi").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 9 && s.perm("togemon").isSuspended);
    expect(s.state.memory).toBe(9);
    expect(s.perm("togemon").isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondMimi").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 5);
    expect(s.state.memory).toBe(5);
    expect(s.perm("other").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;

    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    preferInstanceIds.splice(0, preferInstanceIds.length, s.perm("other").topCard.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thirdMimi").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 9);
    expect(s.state.memory).toBe(9);
    expect(s.perm("other").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;
  });

  it("resets the inherited green Tamer evolution reduction on the next natural turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-053", as: "host", under: ["BT14-046"] },
            { card: "BT1-089", as: "mimi" },
          ],
          hand: [
            { card: "BT1-081", as: "firstEvo" },
            { card: "BT12-057", as: "secondEvo" },
          ],
          deck: Array(8).fill("BT1-009"),
        },
        1: { hand: ["BT1-009"], deck: Array(8).fill("BT1-009") },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("firstEvo").instanceId,
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === "BT1-081");
    expect(s.state.memory).toBe(8);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;

    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("secondEvo").instanceId,
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === "BT12-057");
    expect(s.state.memory).toBe(5);
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;
  });
});
