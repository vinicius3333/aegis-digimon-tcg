import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-005.js";
import "../index.js";

type Setup = ReturnType<typeof setupEngine>;

const SECURITY = ["BT1-012", "BT1-013", "BT1-014"];
const FILLER = ["BT1-012", "BT1-013", "BT1-014", "BT1-012", "BT1-013"];

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

describe("EX4-005 Agumon — catalog and IR", () => {
  it("matches every catalog identity and printed clause", () => {
    expect(getCardDefinition("EX4-005")).toMatchObject({
      cardId: "EX4-005",
      nameEn: "Agumon",
      colors: ["Red", "Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [
        { color: "Red", level: 2, memoryCost: 1 },
        { color: "Yellow", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Dinosaur"],
      effectText:
        "[Digivolve][Koromon]: Cost 0[Start of Your Main Phase] If you have a red or yellow Tamer in play, gain 1 memory.",
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When one of your red or yellow Tamers becomes suspended,  . (Draw 1 card from your deck.)",
    });
  });

  it("registers residual-free IR for the alternate evolution and both effects", () => {
    expect(runtimeCompiledCard("EX4-005")).toMatchObject({ coverage: "full", residual: [] });
    expect(digivolutionRequirementsFor("EX4-005")).toContainEqual({
      names: ["Koromon"],
      cost: 0,
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

describe("EX4-005 Agumon — public hatch and evolution stack", () => {
  it("hatches ST1-01, alternate-digivolves for 0, draws 1, and preserves source identity", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "ST1-01", as: "koromon" }],
        hand: [{ card: "EX4-005", as: "agumon" }],
        deck: [{ card: "BT1-013", as: "evolutionDraw" }, ...FILLER],
        security: SECURITY,
      },
      1: { deck: FILLER, security: SECURITY },
    });
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("koromon").instanceId);
    const sourceId = s.inst("koromon").instanceId;
    const breedingId = s.state.players[0]!.breeding!.permanentId;

    await openMain(s, 0);
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingId,
        instanceId: s.inst("agumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX4-005");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding!.topCard?.cardId).toBe("EX4-005");
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("evolutionDraw").instanceId);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual([...FILLER]);

    closeMain(s, 0);
    await openMain(s, 1);
    closeMain(s, 1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === breedingId));
    expect(s.perm("koromon").topCard?.cardId).toBe("EX4-005");
    expect(s.perm("koromon").stack.map(({ cardId }) => cardId)).toEqual(["ST1-01"]);

    await stopLoop(s, loop, 0);
  });

  it("rejects the alternate route from a non-Koromon Digi-Egg without paying or moving cards", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "ST2-01", as: "tsunomon" }],
        hand: [{ card: "EX4-005", as: "agumon" }],
        deck: FILLER,
        security: SECURITY,
      },
      1: { deck: FILLER, security: SECURITY },
    });
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("tsunomon").instanceId);
    await openMain(s, 0);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsunomon").permanentId,
        instanceId: s.inst("agumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("ST2-01");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("agumon").instanceId);

    await stopLoop(s, loop, 0);
  });
});

describe("EX4-005 Agumon — start-of-main ownership and colors", () => {
  it.each([
    ["BT10-087", "red tamer"],
    ["BT10-089", "yellow tamer"],
  ])("gains 1 memory for a %s in your battle area", async (tamer, _label) => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX4-005", as: "agumon" },
          { card: tamer, as: "tamer" },
        ],
        hand: [{ card: "BT1-013", as: "spare" }],
        deck: FILLER,
        security: SECURITY,
      },
      1: { deck: FILLER, security: SECURITY },
    });
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    expect(s.state.memory).toBe(1);
    await stopLoop(s, loop, 0);
  });

  it("does not count a red Tamer controlled by the opponent", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX4-005", as: "agumon" }], deck: FILLER, security: SECURITY },
      1: { battleArea: [{ card: "BT10-087", as: "opponentTamer" }], deck: FILLER, security: SECURITY },
    });
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    expect(s.state.memory).toBe(0);
    await stopLoop(s, loop, 0);
  });
});

describe("EX4-005 Agumon — inherited suspension draw", () => {
  it("draws once for your red Tamer, ignores blue/opponent Tamers, and resets on your next turn", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "ST1-01", as: "koromon" }],
        hand: [
          { card: "EX4-005", as: "agumon" },
          { card: "BT1-014", as: "host" },
        ],
        battleArea: [
          { card: "BT10-087", as: "redTamer" },
          { card: "BT10-089", as: "yellowTamer" },
          { card: "BT1-086", as: "blueTamer" },
        ],
        deck: [{ card: "BT1-012", as: "drawOne" }, { card: "BT1-013", as: "drawTwo" }, ...FILLER],
        security: SECURITY,
      },
      1: {
        battleArea: [{ card: "BT10-087", as: "opponentRedTamer" }],
        deck: FILLER,
        security: SECURITY,
      },
    });
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "ST1-01");
    const breedingId = s.state.players[0]!.breeding!.permanentId;
    await openMain(s, 0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingId,
        instanceId: s.inst("agumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX4-005");
    closeMain(s, 0);
    await openMain(s, 1);
    closeMain(s, 1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === breedingId));
    await openMain(s, 0);

    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koromon").topCard?.cardId === "BT1-014");
    expect(s.state.memory).toBe(0);
    expect(s.perm("koromon").stack.map(({ cardId }) => cardId)).toEqual(["ST1-01", "EX4-005"]);

    const handBefore = s.state.players[0]!.hand.length;
    const deckBefore = s.state.players[0]!.deck.length;
    await advance(s.engine).verb.suspend([s.perm("redTamer").permanentId]);
    await settle(() => s.state.players[0]!.hand.length === handBefore + 1);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-012");

    await advance(s.engine).verb.unsuspend([s.perm("redTamer").permanentId]);
    const sameTurnHand = s.state.players[0]!.hand.length;
    await advance(s.engine).verb.suspend([s.perm("yellowTamer").permanentId]);
    await settle();
    expect(s.state.players[0]!.hand).toHaveLength(sameTurnHand);

    await advance(s.engine).verb.unsuspend([
      s.perm("yellowTamer").permanentId,
      s.perm("blueTamer").permanentId,
      s.perm("opponentRedTamer").permanentId,
    ]);
    await advance(s.engine).verb.suspend([s.perm("blueTamer").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("opponentRedTamer").permanentId]);
    await settle();
    expect(s.state.players[0]!.hand).toHaveLength(sameTurnHand);

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
