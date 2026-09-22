import { describe, expect, it } from "vitest";
import { Phase, type Seat } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-069.js";
import "../BT14/index.js";
import "../BT20/index.js";
import "./index.js";

describe("BT17-069 Fenriloogamon", () => {
  it("binds the trash-played Fenriloogamon or Kazuchimon for the delayed return", () => {
    const digivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(digivolving?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      bindResultAs: "playedFenriloogamon",
      target: { filter: { nameOrTrait: [{ tokens: ["Fenriloogamon", "Kazuchimon"], match: "name" }] } },
    });
    expect(digivolving?.actions[1]).toMatchObject({
      kind: "DelayedEffect",
      trigger: "nextEndOfOpponentTurn",
      effect: { kind: "Return", target: { filter: { boundRef: "playedFenriloogamon" } }, to: "hand" },
    });
  });

  it("keeps the Once Per Turn deletion trigger scoped to SoC or Pulsemon text", () => {
    const effect = compiled.effects.find((entry) => entry.frequency === "OncePerTurn");
    expect(effect?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon", "Tamer"],
        nameOrTrait: [
          { tokens: ["SoC"], match: "trait" },
          { tokens: ["Pulsemon"], match: "text" },
        ],
      },
      actions: [
        { kind: "Delete", target: { filter: { controller: "opponent", dp: { op: "lte", value: 10000 } }, count: 1 } },
      ],
    });
  });

  it("uses the supported turn-end memory threshold for its inherited clause", () => {
    const inherited = compiled.effects.find((entry) => entry.trigger === "YourTurn" && entry.isInherited);
    expect(inherited?.actions[0]).toMatchObject({
      kind: "SetTurnEndMemory",
      minimum: 3,
      condition: { kind: "selfHasNameContaining", names: ["Fenriloogamon"] },
    });
  });

  it("deletes a 10000 DP opposing Digimon when an SoC Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-069", as: "fenriloogamon" }],
          hand: [{ card: "BT14-071", as: "loogamon" }],
        },
        1: { battleArea: [{ card: "BT17-070", dp: 10000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const targetId = s.perm("target").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("loogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));

    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT17-070")).toBe(true);
  });

  it("accepts Pulsemon text and enforces the 10000 DP boundary once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-069", as: "fenriloogamon" }],
          hand: [
            { card: "BT14-071", as: "socPlay" },
            { card: "BT16-039", as: "pulsemonText" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT17-070", dp: 10000, as: "atLimit" },
            { card: "BT17-070", dp: 10001, as: "aboveLimit" },
            { card: "BT17-070", dp: 10000, as: "secondAtLimit" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const atLimitId = s.perm("atLimit").permanentId;
    const aboveLimitId = s.perm("aboveLimit").permanentId;
    const secondAtLimitId = s.perm("secondAtLimit").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("socPlay").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === atLimitId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === atLimitId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === aboveLimitId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === secondAtLimitId)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pulsemonText").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === secondAtLimitId)).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("plays the matching Fenriloogamon from trash and returns it at the next opponent turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-061", under: ["BT14-087"], as: "base" }],
          hand: [{ card: "BT17-069", as: "fenriloogamon" }],
          trash: [{ card: "BT14-081", as: "playedFenriloogamon" }],
          deck: ["BT1-011", "BT1-012"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("fenriloogamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-081"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-081")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT14-081")).toBe(false);

    await advance(s.engine).runTurn(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-081")).toBe(true);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT14-081"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT14-081")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-081")).toBe(false);
  });

  it("keeps the active turn through opponent memory 1 or 2, then ends at 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-101", under: ["BT17-069"], as: "host" }],
        hand: [
          { card: "BT1-012", as: "firstPlay" },
          { card: "BT1-012", as: "secondPlay" },
        ],
        deck: ["BT1-011", "BT1-011"],
      },
      1: { deck: ["BT1-011", "BT1-011"] },
    });
    s.state.isFirstPlayersFirstTurn = false;
    s.state.memory = 2;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstPlay").instanceId })).toEqual({
      ok: true,
    });
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.memory).toBe(-1);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondPlay").instanceId })).toEqual({
      ok: true,
    });
    await turn;

    expect(s.state.memory).toBe(-4);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT1-012")).toHaveLength(
      2,
    );
  });

  it("refuses the SoC digivolve route from a non-SoC level 5 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-020", as: "nonSoc" }],
        hand: [{ card: "BT17-069", as: "fenriloogamon" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("nonSoc").permanentId,
        instanceId: s.inst("fenriloogamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("deletes a 10000 DP opposing Digimon on the Pulsemon-in-text branch with no SoC source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-069", as: "fenriloogamon" }],
          hand: [{ card: "BT16-039", as: "pulsemonText" }],
          deck: ["BT1-011", "BT1-011", "BT1-011", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT17-070", dp: 10000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const targetId = s.perm("target").permanentId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pulsemonText").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT17-070")).toBe(true);
  });

  it("deletes once per turn: refuses a second same-turn play, resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-069", as: "fenriloogamon" }],
          hand: [
            { card: "BT14-071", as: "turnOnePlayA" },
            { card: "BT14-071", as: "turnOnePlayB" },
            { card: "BT14-071", as: "turnThreePlay" },
          ],
          deck: ["BT1-011", "BT1-011", "BT1-011", "BT1-011", "BT1-011", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT17-070", dp: 10000 },
            { card: "BT17-070", dp: 10000 },
            { card: "BT17-070", dp: 10000 },
          ],
          security: ["BT1-011", "BT1-011", "BT1-011"],
          deck: ["BT1-011", "BT1-011", "BT1-011", "BT1-011", "BT1-011", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 20;
    await s.ready();

    const opposingTargets = () =>
      s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT17-070").length;
    const play = (alias: string) => s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(alias).instanceId });

    const turn1 = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(play("turnOnePlayA")).toEqual({ ok: true });
    await settle(() => opposingTargets() === 2);
    expect(opposingTargets()).toBe(2);

    expect(play("turnOnePlayB")).toEqual({ ok: true });
    await settle();
    expect(opposingTargets()).toBe(2);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn1;

    const passTurn = (mem: number) => {
      s.state.turnSeat = (1 - s.state.turnSeat) as Seat;
      s.state.memory = mem;
    };

    passTurn(20);
    await advance(s.engine).runTurn(1);

    passTurn(20);
    const turn3 = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(play("turnThreePlay")).toEqual({ ok: true });
    await settle(() => opposingTargets() === 1);
    expect(opposingTargets()).toBe(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn3;
  });

  /**
   * KB Q2831 (BT17-069): "the turn won't end unless the memory moves to 3 or more on your
   * opponent's side. Your turn will continue when your opponent's memory is at 1 or 2."
   * Q2832 scopes it to your own turn. [Fenriloogamon: Takemikazuchi] satisfies the
   * "has [Fenriloogamon] in its name" gate by name containment.
   */
  describe("inherited turn-end condition under Fenriloogamon: Takemikazuchi", () => {
    const takemikazuchiSetup = () =>
      setupEngine(
        {
          0: {
            battleArea: [{ card: "BT20-081", as: "host", under: ["BT17-069"] }],
            hand: [
              { card: "BT1-009", as: "firstPlay" },
              { card: "BT1-009", as: "secondPlay" },
              { card: "BT14-069", as: "thirdPlay" },
            ],
          },
          1: { battleArea: [{ card: "BT1-009", as: "blocker" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );

    it("raises the threshold to 3 while Fenriloogamon is a digivolution card", async () => {
      const s = takemikazuchiSetup();
      await s.ready();
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);

      expect(s.engine.memory.turnEndMinMemoryFor(0)).toBe(3);

      advance(s.engine).endMainPhaseIfOpen(0);
      await turn;
    });

    it("keeps the turn open at 2 opponent memory and ends it at 3", async () => {
      const s = takemikazuchiSetup();
      await s.ready();
      s.state.memory = 2;
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);

      const play = (as: string) => s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(as).instanceId });

      expect(play("firstPlay")).toEqual({ ok: true });
      await settle(() => s.state.memory === 0);
      expect(s.state.phase).toBe(Phase.Main);

      // 2 memory on the opponent's side: a normal turn would already have passed here.
      expect(play("secondPlay")).toEqual({ ok: true });
      await settle(() => s.state.memory === -2);
      expect(s.state.phase).toBe(Phase.Main);
      expect(s.events).not.toContainEqual(expect.objectContaining({ kind: "turnEnded", endingSeat: 0 }));

      // Crossing to 3 or more finally meets the raised turn-end condition.
      expect(play("thirdPlay")).toEqual({ ok: true });
      await turn;
      expect(s.state.memory).toBeLessThanOrEqual(-3);
      expect(s.events).toContainEqual(expect.objectContaining({ kind: "turnEnded", endingSeat: 0 }));
    });

    it("does not raise the threshold from the printed side while Fenriloogamon is the top card", async () => {
      const s = setupEngine(
        { 0: { battleArea: [{ card: "BT17-069", as: "host" }] } },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);

      expect(s.engine.memory.turnEndMinMemoryFor(0)).toBe(1);

      advance(s.engine).endMainPhaseIfOpen(0);
      await turn;
    });

    it("stays scoped to your own turn (Q2832)", async () => {
      const s = takemikazuchiSetup();
      await s.ready();
      s.state.turnSeat = 1;
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(1);

      expect(s.engine.memory.turnEndMinMemoryFor(1)).toBe(1);

      advance(s.engine).endMainPhaseIfOpen(1);
      await turn;
    });
  });
});
