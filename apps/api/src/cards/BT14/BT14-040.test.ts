import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-040.js";

describe("BT14-040", () => {
  it("preserves Jijimon's catalog identity and exact IR", () => {
    expect(getCardDefinition("BT14-040")).toMatchObject({
      nameEn: "Jijimon",
      colors: ["Yellow"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Yellow", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Ancient"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "SecurityManipulation",
        op: "placeAsSecurity",
        from: ["hand"],
        toTop: true,
        optional: true,
        source: { filter: { kind: ["Tamer"] }, count: 1 },
      });
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controllerDefault: "mine", kind: ["Tamer"] },
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["hand"],
              payCost: false,
              optional: true,
              target: { filter: { levels: [3] } },
            },
          ],
        },
      ],
    });
  });

  it("places a Tamer at security top on play without treating that placement as playing it", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT14-040", as: "jijimon" },
            { card: "BT14-082", as: "tamer" },
            { card: "BT14-031", as: "rookie" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jijimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security[0]?.cardId === "BT14-082");
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT14-082", "BT1-009"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT14-031");
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT14-040"]);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("uses the legal level-5 evolution route and the same optional security placement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-037", as: "base" }],
          hand: [
            { card: "BT14-040", as: "jijimon" },
            { card: "BT14-083", as: "tamer" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("jijimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security[0]?.cardId === "BT14-083");
    expect(s.perm("base").topCard.cardId).toBe("BT14-040");
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("BT14-037");
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("plays one level-3 for free after its controller plays a Tamer and only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-040", as: "jijimon" }],
          hand: [
            { card: "BT14-082", as: "firstTamer" },
            { card: "BT14-083", as: "secondTamer" },
            { card: "BT14-031", as: "firstRookie" },
            { card: "BT14-032", as: "secondRookie" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => ["BT14-031", "BT14-032"].includes(permanent.topCard.cardId)),
    );
    const rookieCount = () =>
      s.state.players[0]!.battleArea.filter((permanent) => ["BT14-031", "BT14-032"].includes(permanent.topCard.cardId))
        .length;
    expect(rookieCount()).toBe(1);
    const memoryAfterFirst = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(rookieCount()).toBe(1);
    expect(s.state.memory).toBe(memoryAfterFirst - 3);
    assertNoLoudGap(s);
  });

  it("does not react when the opponent plays a Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-040", as: "jijimon" }], hand: [{ card: "BT14-031", as: "rookie" }] },
        1: { hand: [{ card: "BT14-082", as: "opponentTamer" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-082"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT14-031");
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT14-040"]);
    assertNoLoudGap(s);
  });

  it("resets the all-turns Tamer trigger on the next natural turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-040", as: "jijimon" }],
          hand: [
            { card: "BT14-082", as: "firstTamer" },
            { card: "BT14-083", as: "sameTurnTamer" },
            { card: "BT14-082", as: "nextTurnTamer" },
            { card: "BT14-031", as: "firstRookie" },
            { card: "BT14-032", as: "secondRookie" },
          ],
          security: ["BT1-091", "BT1-091", "BT1-091"],
          deck: Array(8).fill("BT1-009"),
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentHand" }],
          security: ["BT1-091", "BT1-091", "BT1-091"],
          deck: Array(8).fill("BT1-009"),
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    const firstRookieId = s.inst("firstRookie").instanceId;
    const secondRookieId = s.inst("secondRookie").instanceId;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === firstRookieId),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === firstRookieId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(secondRookieId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sameTurnTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === secondRookieId)).toBe(
      false,
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(secondRookieId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;

    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nextTurnTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === secondRookieId),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === secondRookieId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(secondRookieId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;
    assertNoLoudGap(s);
  });
});
