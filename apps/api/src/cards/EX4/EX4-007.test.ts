import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-007.js";
import "../index.js";

type Setup = ReturnType<typeof setupEngine>;

const DRAW_DECK = ["BT1-012", "BT1-013", "BT1-014"];

async function openMain(s: Setup, seat: 0 | 1): Promise<void> {
  await advance(s.engine).waitForMainPhase(seat);
}

function closeMain(s: Setup, seat: 0 | 1): void {
  advance(s.engine).endMainPhaseIfOpen(seat);
}

async function stopLoop(s: Setup, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  expect(s.engine.applyIntent(seat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("EX4-007 GeoGreymon — catalog and IR", () => {
  it("matches every catalog identity and printed clause", () => {
    expect(getCardDefinition("EX4-007")).toMatchObject({
      cardId: "EX4-007",
      nameEn: "GeoGreymon",
      colors: ["Red", "Yellow"],
      kinds: ["Digimon"],
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
      effectText:
        "Digivolve: 2 from Lv.3 w/[Agumon] in name and [Dinosaur] trait[Start of Your Main Phase] If you have a red or yellow Tamer in play, gain 1 memory.",
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When one of your red or yellow Tamers becomes suspended,  . (Draw 1 card from your deck.)",
    });
  });

  it("registers full residual-free IR, both ordinary costs, and the exact alternate route", () => {
    expect(runtimeCompiledCard("EX4-007")).toMatchObject({ coverage: "full", residual: [] });
    expect(digivolutionRequirementsFor("EX4-007")).toContainEqual({
      level: 3,
      names: ["Agumon"],
      traits: ["Dinosaur"],
      cost: 2,
      isAlternate: true,
    });
    expect(compiled.effects).toEqual([
      {
        trigger: "StartOfYourMainPhase",
        actions: [
          {
            kind: "GainMemory",
            amount: 1,
            condition: {
              kind: "youHave",
              filter: {
                zone: "battleArea",
                controllerDefault: "mine",
                kind: ["Tamer"],
                colors: ["Red", "Yellow"],
              },
              raw: "you have a red or yellow Tamer in play",
            },
          },
        ],
      },
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenSuspended",
            sourceFilter: { controller: "mine", kind: ["Tamer"], colors: ["Red", "Yellow"] },
            actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
          },
        ],
        isInherited: true,
        frequency: "OncePerTurn",
      },
    ]);
  });
});

describe("EX4-007 GeoGreymon — public evolution stack", () => {
  it.each([
    ["red", "BT1-011", false, 3],
    ["yellow", "EX4-023", false, 3],
    ["Agumon/Dinosaur alternate", "BT1-011", true, 2],
  ])(
    "digivolves through the printed %s route, pays its cost, draws the evolution card, and preserves the source",
    async (_route, baseCard, useAlternateCost, cost) => {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [{ card: "EX4-007", as: "geogreymon" }],
          deck: DRAW_DECK,
        },
      });
      s.state.memory = cost;
      await s.ready();
      const sourceInstanceId = s.inst("base").instanceId;
      const evolutionInstanceId = s.inst("geogreymon").instanceId;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: evolutionInstanceId,
          ...(useAlternateCost ? { useAlternateCost: true } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "EX4-007");

      expect(s.state.memory).toBe(0);
      expect(s.perm("base").topCard?.instanceId).toBe(evolutionInstanceId);
      expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([sourceInstanceId]);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-012");
      expect(s.state.players[0]!.deck).toHaveLength(DRAW_DECK.length - 1);
    },
  );

  it("rejects an ineligible level-3 source that matches neither the ordinary nor alternate route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-031", as: "blueMonmon" }],
        hand: [{ card: "EX4-007", as: "geogreymon" }],
        deck: DRAW_DECK,
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueMonmon").permanentId,
        instanceId: s.inst("geogreymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(2);
    expect(s.perm("blueMonmon").topCard?.cardId).toBe("BT1-031");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("geogreymon").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(DRAW_DECK.length);
  });
});

describe("EX4-007 GeoGreymon — start-of-main ownership and colors", () => {
  it.each([
    ["red", "BT1-085"],
    ["yellow", "AD1-019"],
  ])("gains exactly 1 memory at the start of your main phase with a %s Tamer", async (_color, tamer) => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX4-007", as: "geogreymon" },
          { card: tamer, as: "tamer" },
        ],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);

    expect(s.state.memory).toBe(4);
    await stopLoop(s, loop, 0);
  });

  it("does not count an opponent red Tamer or a board with no Tamer", async () => {
    const opponentTamer = setupEngine({
      0: { battleArea: [{ card: "EX4-007", as: "geogreymon" }] },
      1: { battleArea: [{ card: "BT1-085", as: "opponentTamer" }] },
    });
    opponentTamer.state.turnSeat = 0;
    opponentTamer.state.memory = 3;
    await opponentTamer.ready();
    const opponentLoop = opponentTamer.engine.startTurnLoop();
    await openMain(opponentTamer, 0);
    expect(opponentTamer.state.memory).toBe(3);
    await stopLoop(opponentTamer, opponentLoop, 0);

    const noTamer = setupEngine({ 0: { battleArea: [{ card: "EX4-007", as: "geogreymon" }] } });
    noTamer.state.turnSeat = 0;
    noTamer.state.memory = 3;
    await noTamer.ready();
    const noTamerLoop = noTamer.engine.startTurnLoop();
    await openMain(noTamer, 0);
    expect(noTamer.state.memory).toBe(3);
    await stopLoop(noTamer, noTamerLoop, 0);
  });
});

describe("EX4-007 GeoGreymon — inherited suspension draw", () => {
  it("draws once from either matching Tamer, ignores blue/opponent Tamers, and resets on your next turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX4-009", as: "host", under: ["EX4-007"] },
          { card: "BT1-085", as: "redTamer" },
          { card: "AD1-019", as: "yellowTamer" },
          { card: "BT1-086", as: "blueTamer" },
        ],
        deck: [{ card: "BT1-012", as: "firstDraw" }, { card: "BT1-013", as: "secondDraw" }, ...DRAW_DECK],
      },
      1: { battleArea: [{ card: "BT1-085", as: "opponentRedTamer" }], deck: DRAW_DECK },
    });
    s.state.turnSeat = 0;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);

    const handBefore = s.state.players[0]!.hand.length;
    const deckBefore = s.state.players[0]!.deck.length;
    await advance(s.engine).verb.suspend([s.perm("redTamer").permanentId]);
    await settle(() => s.state.players[0]!.hand.length === handBefore + 1);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-012");

    await advance(s.engine).verb.unsuspend([s.perm("redTamer").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("yellowTamer").permanentId]);
    await settle();
    expect(s.state.players[0]!.hand).toHaveLength(handBefore + 1);

    await advance(s.engine).verb.unsuspend([
      s.perm("redTamer").permanentId,
      s.perm("yellowTamer").permanentId,
      s.perm("blueTamer").permanentId,
      s.perm("opponentRedTamer").permanentId,
    ]);
    await advance(s.engine).verb.suspend([s.perm("blueTamer").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("opponentRedTamer").permanentId]);
    await settle();
    expect(s.state.players[0]!.hand).toHaveLength(handBefore + 1);

    closeMain(s, 0);
    await openMain(s, 1);
    closeMain(s, 1);
    await openMain(s, 0);
    const nextTurnHand = s.state.players[0]!.hand.length;
    await advance(s.engine).verb.suspend([s.perm("redTamer").permanentId]);
    await settle(() => s.state.players[0]!.hand.length === nextTurnHand + 1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-013");

    await stopLoop(s, loop, 0);
  });
});
