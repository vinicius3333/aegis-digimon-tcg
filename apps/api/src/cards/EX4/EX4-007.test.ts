import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-007.js";
import "../index.js";

describe("EX4-007 GeoGreymon", () => {
  it("has the official identity and gains memory with a red or yellow Tamer", () => {
    expect(getCardDefinition("EX4-007")).toMatchObject({
      cardId: "EX4-007",
      nameEn: "GeoGreymon",
      colors: ["Red", "Yellow"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Red", level: 3, memoryCost: 3 },
        { color: "Yellow", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Dinosaur"],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions?.[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: {
        kind: "youHave",
        filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"], colors: ["Red", "Yellow"] },
      },
    });
  });

  it.each([
    ["red", "BT1-010"],
    ["yellow", "BT1-046"],
  ])("digivolves normally from a %s level 3 for 3", async (_color, baseCard) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "EX4-007", as: "geogreymon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("geogreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-007");

    expect(s.state.memory).toBe(0);
  });

  it("uses the 2-cost route only from a level 3 with Agumon in name and Dinosaur in traits", async () => {
    const valid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-011", as: "agumonExpert" }],
        hand: [{ card: "EX4-007", as: "geogreymon" }],
      },
    });
    valid.state.memory = 2;
    await valid.ready();

    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("agumonExpert").permanentId,
        instanceId: valid.inst("geogreymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("agumonExpert").topCard.cardId === "EX4-007");
    expect(valid.state.memory).toBe(0);

    const invalidTrait = setupEngine({
      0: {
        battleArea: [{ card: "BT11-046", as: "reptileAgumon" }],
        hand: [{ card: "EX4-007", as: "geogreymon" }],
      },
    });
    invalidTrait.state.memory = 2;
    await invalidTrait.ready();

    expect(
      invalidTrait.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalidTrait.perm("reptileAgumon").permanentId,
        instanceId: invalidTrait.inst("geogreymon").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(false);
  });
  it("inherits the red/yellow Tamer suspension draw watcher", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", kind: ["Tamer"], colors: ["Red", "Yellow"] },
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    });
  });

  it("gains memory at the start of main phase with a red Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX4-007", as: "host" },
          { card: "BT1-085", as: "tamer" },
        ],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));

    expect(s.state.memory).toBe(1);
  });

  it("gains memory at the start of main phase with a yellow Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX4-007", as: "host" },
          { card: "AD1-019", as: "tamer" },
        ],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));

    expect(s.state.memory).toBe(1);
  });

  it("draws once when a matching inherited Tamer becomes suspended", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010", "BT1-011"],
        battleArea: [
          { card: "BT4-009", as: "host", under: ["EX4-007"] },
          { card: "BT1-085", as: "tamer" },
        ],
      },
    });
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.None, s.perm("host"));

    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);
    await settle(() => s.state.players[0]!.hand.length === 1);

    await advance(s.engine).verb.unsuspend([s.perm("tamer").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw when a blue Tamer becomes suspended", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010", "BT1-011"],
        battleArea: [
          { card: "BT4-009", as: "host", under: ["EX4-007"] },
          { card: "BT1-086", as: "tamer" },
        ],
      },
    });
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.None, s.perm("host"));

    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("does not gain memory without an allied matching Tamer or draw outside its controller's turn", async () => {
    const noTamer = setupEngine({ 0: { battleArea: [{ card: "EX4-007", as: "geogreymon" }] } });
    noTamer.state.turnSeat = 0;
    await noTamer.ready();
    await advance(noTamer.engine).fire(EffectTiming.OnStartMainPhase, noTamer.perm("geogreymon"));
    expect(noTamer.state.memory).toBe(0);

    const opponentTurn = setupEngine({
      0: {
        deck: ["BT1-010"],
        battleArea: [
          { card: "BT4-009", as: "host", under: ["EX4-007"] },
          { card: "BT1-085", as: "redTamer" },
        ],
      },
    });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();
    await advance(opponentTurn.engine).verb.suspend([opponentTurn.perm("redTamer").permanentId]);

    expect(opponentTurn.state.players[0]!.hand).toHaveLength(0);
    expect(opponentTurn.state.players[0]!.deck).toHaveLength(1);
  });
});
