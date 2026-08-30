import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-101.js";
import "./BT13-035.js";
import "../BT10/BT10-009.js";

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
    const watcher = compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0] as {
      sourceFilter?: unknown;
      actions?: unknown[];
    };
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
    expect(watcher.actions?.[0]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
      cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, optional: true },
      abortOnDecline: true,
    });
    expect(watcher.actions?.[1]).toMatchObject({
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
      { 0: { battleArea: [{ card: "BT13-101", as: "tamers" }], hand: [{ card: "BT13-035", as: "pawn" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("tamers"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT13-035"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT13-035")).toBe(true);
  });

  it("draws and gains memory for a black/yellow PawnChessmon, not a red/yellow Shoutmon X4", async () => {
    const eligible = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-101", as: "tamers" }],
          hand: [{ card: "BT13-035", as: "pawn" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    eligible.state.memory = 10;
    await eligible.ready();
    expect(eligible.engine.applyIntent(0, { type: "playCard", instanceId: eligible.inst("pawn").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => eligible.state.players[0]!.hand.some((card) => card.cardId === "BT1-001"));
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
    expect(ineligible.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(false);
  });

  it("may decline the suspend processing cost without drawing or gaining memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-101", as: "tamers" }],
          hand: [{ card: "BT13-035", as: "pawn" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pawn").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-035"));

    expect(s.perm("tamers").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(false);
  });
});
