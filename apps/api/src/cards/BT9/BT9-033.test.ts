import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../BT5/BT5-098.js";
import "../EX5/EX5-009.js";
import "../ST20/ST20-13.js";
import "../BT20/BT20-093.js";
import "./BT9-030.js";
import { compiled } from "./BT9-033.js";

describe("BT9-033 Pillomon", () => {
  it("matches its catalog and all-turn effect-play restriction IR", () => {
    expect(getCardDefinition("BT9-033")).toMatchObject({
      cardId: "BT9-033",
      nameEn: "Pillomon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Mammal"],
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "AllTurns",
          actions: [
            {
              kind: "RestrictPlay",
              seat: "any",
              filter: { kind: ["Digimon"] },
              mode: "play",
              byEffectOnly: true,
              duration: "permanent",
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("prevents effect plays but permits a normal Digimon play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-030", as: "source", under: [{ card: "BT9-026", as: "material" }] }],
          hand: [{ card: "BT10-019", as: "normalPlay" }],
        },
        1: { battleArea: [{ card: "BT9-033", as: "pillomon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);

    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("normalPlay").instanceId,
      }),
    ).toEqual({ ok: true });
  });
});

function isInHand(s: EngineSetup, alias: string): boolean {
  return s.state.players[0]!.hand.some((card) => card.instanceId === s.inst(alias).instanceId);
}

function isOnBattleArea(s: EngineSetup, alias: string): boolean {
  return s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst(alias).instanceId);
}

async function useMeteorShower(yellowDigimon: string): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: yellowDigimon }],
        hand: [
          { card: "BT5-098", as: "meteorShower" },
          { card: "BT5-035", as: "starmons" },
        ],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 5;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("meteorShower").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("meteorShower").instanceId));
  await settle();
  return s;
}

async function playIndramon(opponentField: string[]): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: {
        hand: [
          { card: "EX5-009", as: "indramon" },
          { card: "EX5-010", as: "sandiramon" },
        ],
        deck: ["BT1-009", "BT1-013", "BT1-009"],
      },
      1: { battleArea: opponentField.map((card) => ({ card })) },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 7;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("indramon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.hand.length === 2);
  await settle();
  return s;
}

async function useDragonGene(opponentField: string[]): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT1-009" }],
        hand: [
          { card: "BT20-093", as: "dragonGene" },
          { card: "BT20-023", as: "coredramon" },
        ],
      },
      1: { battleArea: opponentField.map((card) => ({ card })) },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 4;
  await s.ready();
  const dragonGeneId = s.inst("dragonGene").instanceId;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: dragonGeneId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === dragonGeneId));
  await settle();
  return s;
}

describe("BT9-033 Pillomon — KB Q&A rulings", () => {
  it("prevents an Option card effect from playing a Digimon (Q1831)", async () => {
    const blocked = await useMeteorShower("BT9-033");
    expect(isInHand(blocked, "starmons")).toBe(true);
    expect(isOnBattleArea(blocked, "starmons")).toBe(false);

    const control = await useMeteorShower("BT5-033");
    expect(isOnBattleArea(control, "starmons")).toBe(true);
  });

  it("lets an effect that only reduces the play cost activate but blocks one that reduces and plays (Q1832)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-13", as: "tamer" }],
          hand: [{ card: "ST20-07", as: "adventure" }],
        },
        1: { battleArea: [{ card: "BT9-033", as: "pillomon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("adventure").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => isOnBattleArea(s, "adventure"));

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(3);

    const reduceAndPlay = await useDragonGene(["BT9-033"]);
    expect(isInHand(reduceAndPlay, "coredramon")).toBe(true);
    expect(isOnBattleArea(reduceAndPlay, "coredramon")).toBe(false);
    expect(reduceAndPlay.state.memory).toBe(2);

    const reduceAndPlayControl = await useDragonGene(["BT1-009"]);
    expect(isOnBattleArea(reduceAndPlayControl, "coredramon")).toBe(true);
    expect(reduceAndPlayControl.state.memory).toBe(0);
  });

  it("prevents effects from playing a Digimon into the breeding area (Q5205)", async () => {
    const blocked = await playIndramon(["BT9-033"]);
    expect(isOnBattleArea(blocked, "indramon")).toBe(true);
    expect(blocked.state.players[0]!.breeding).toBeUndefined();
    expect(isInHand(blocked, "sandiramon")).toBe(true);

    const control = await playIndramon(["BT1-009"]);
    expect(control.state.players[0]!.breeding?.topCard.instanceId).toBe(control.inst("sandiramon").instanceId);
  });
});
