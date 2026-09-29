import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-101.js";
import "./BT13-035.js";
import "./BT13-064.js";
import "../BT10/BT10-009.js";
import "../EX4/EX4-074.js";

describe("BT13-101 Miki Kurosaki & Megumi Shirakawa", () => {
  it("may play a PawnChessmon from hand without paying", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: {
        filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "name", tokens: ["PawnChessmon"] }] },
        count: 1,
      },
    });
  });

  it("requires a two-color black/yellow Digimon and suspending this Tamer before draw and memory", () => {
    const watcher = compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0];
    expect(watcher?.kind).toBe("SubTrigger");
    if (watcher?.kind !== "SubTrigger") throw new Error("BT13-101 AllTurns watcher must be a SubTrigger");
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: {
        controllerDefault: "mine",
        kind: ["Digimon"],
        multicolor: true,
        colorsAll: ["Yellow", "Black"],
      },
    });
    expect(watcher.actions[0]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
      cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, optional: true },
      abortOnDecline: true,
    });
    expect(watcher.actions[1]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "ifThisEffectActed", raw: "you did" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    });
  });

  it("plays PawnChessmon from hand through its on-play effect", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT13-101", as: "tamers" },
            { card: "BT13-035", as: "pawn" },
          ],
          deck: Array.from({ length: 8 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamers").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT13-035"));
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("pawn").instanceId),
    ).toBe(true);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.deck).toHaveLength(7);
  });

  it("draws and gains memory for a black/yellow PawnChessmon, not a red/yellow Shoutmon X4", async () => {
    const eligible = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-101", as: "tamers" }],
          hand: [{ card: "BT13-035", as: "pawn" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    eligible.state.memory = 10;
    await eligible.ready();
    expect(eligible.engine.applyIntent(0, { type: "playCard", instanceId: eligible.inst("pawn").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => eligible.state.players[0]!.hand.some((card) => card.cardId === "BT1-009"));
    expect(eligible.perm("tamers").isSuspended).toBe(true);

    const ineligible = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-101", as: "tamers" }],
          hand: [{ card: "BT10-009", as: "shoutmon" }],
          deck: [],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    ineligible.state.memory = 10;
    await ineligible.ready();
    expect(
      ineligible.engine.applyIntent(0, { type: "playCard", instanceId: ineligible.inst("shoutmon").instanceId }),
    ).toEqual({ ok: true });
    await settle();
    expect(ineligible.perm("tamers").isSuspended).toBe(false);
    expect(ineligible.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(false);
  });

  it("may decline the suspend processing cost without drawing or gaining memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-101", as: "tamers" }],
          hand: [{ card: "BT13-035", as: "pawn" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pawn").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-035"));

    expect(s.perm("tamers").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(false);
  });
});

describe("BT13-101 Miki Kurosaki & Megumi Shirakawa — KB Q&A rulings", () => {
  async function playBesideTamers(playedCard: string, opts: { opponentZeroDpAura?: boolean } = {}) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-101", as: "tamers" }],
          hand: [{ card: playedCard, as: "played" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: opts.opponentZeroDpAura === true ? { battleArea: [{ card: "EX4-074", as: "ruinMode" }] } : {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    if (opts.opponentZeroDpAura === true) {
      // ShineGreymon: Ruin Mode's -5000 DP to all of seat 0's Digimon, activated on the opponent's turn.
      s.state.turnSeat = 1;
      await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("ruinMode"));
      s.state.turnSeat = 0;
    }
    s.state.memory = 10;
    const playedId = s.inst("played").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: playedId })).toEqual({ ok: true });
    await settle(() =>
      opts.opponentZeroDpAura === true
        ? s.state.players[0]!.trash.some((card) => card.instanceId === playedId)
        : s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === playedId),
    );
    await drainMicrotasks();
    const playCost = getCardDefinition(playedCard)!.playCost;
    return {
      s,
      triggered: s.perm("tamers").isSuspended,
      drew: s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId),
      memoryGained: s.state.memory - (10 - playCost),
    };
  }

  it("triggers [All Turns] for a 2-color Digimon whether its colors are yellow/black or black/yellow (Q2348)", async () => {
    expect(getCardDefinition("BT13-035")!.colors).toEqual(["Yellow", "Black"]);
    expect(getCardDefinition("BT13-064")!.colors).toEqual(["Black", "Yellow"]);

    const yellowBlack = await playBesideTamers("BT13-035");
    expect(yellowBlack).toMatchObject({ triggered: true, drew: true, memoryGained: 1 });
    const blackYellow = await playBesideTamers("BT13-064");
    expect(blackYellow).toMatchObject({ triggered: true, drew: true, memoryGained: 1 });

    const monoYellow = await playBesideTamers("BT1-046");
    expect(monoYellow).toMatchObject({ triggered: false, drew: false, memoryGained: 0 });
  });

  it("still triggers [All Turns] when the played black/yellow Digimon is deleted on play by an opponent's 0-DP effect (Q2349)", async () => {
    const deleted = await playBesideTamers("BT13-064", { opponentZeroDpAura: true });
    expect(
      deleted.s.state.players[0]!.trash.some((card) => card.instanceId === deleted.s.inst("played").instanceId),
    ).toBe(true);
    expect(deleted).toMatchObject({ triggered: true, drew: true, memoryGained: 1 });

    const offColor = await playBesideTamers("BT1-009", { opponentZeroDpAura: true });
    expect(offColor).toMatchObject({ triggered: false, drew: false, memoryGained: 0 });
  });
});
