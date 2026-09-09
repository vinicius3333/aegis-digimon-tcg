import { describe, expect, it } from "vitest";
import { getCardDefinition, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX4-006.js";

describe("EX4-006 Guilmon", () => {
  it("matches the complete catalog identity and residual-free IR", () => {
    expect(getCardDefinition("EX4-006")).toMatchObject({
      cardId: "EX4-006",
      nameEn: "Guilmon",
      colors: ["Red", "Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [
        { color: "Red", level: 2, memoryCost: 1 },
        { color: "Purple", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Reptile"],
      effectText:
        "[Digivolve][Gigimon]: Cost 0[On Play] If the total number of cards in both players' trashes is 20 or more, this Digimon gains  for the turn. (This Digimon may attack the turn it was played.)",
      maxCountInDeck: 4,
    });
    expect(getCardDefinition("EX4-006")?.inheritedEffectText).toBeUndefined();
    expect(runtimeCompiledCard("EX4-006")).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "GainKeyword",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            keyword: { keyword: "Rush", raw: "＜Rush＞" },
            duration: "forTheTurn",
            condition: {
              kind: "combinedTrashCount",
              op: "gte",
              value: 20,
              raw: "the total number of cards in both players' trashes is 20 or more",
            },
          },
        ],
      },
    ]);
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Gigimon"], cost: 0, isAlternate: true }]);
  });

  it.each([
    ["red", "ST1-01"],
    ["purple", "ST6-01"],
  ])("publicly hatches a %s egg, evolves for 1, draws, and preserves the source stack", async (_color, eggCard) => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: eggCard, as: "egg" }],
        hand: [{ card: "EX4-006", as: "guilmon" }],
        deck: [
          { card: "BT1-013", as: "evolutionDraw" },
          { card: "BT1-012", as: "remaining" },
        ],
        security: ["BT1-013"],
      },
      1: { deck: ["BT1-013", "BT1-012"], security: ["BT1-013"] },
    });
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === eggCard);
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingPermanentId,
        instanceId: s.inst("guilmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX4-006");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("evolutionDraw").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("remaining").instanceId]);
    expect(s.state.players[0]!.breeding!.topCard!.instanceId).toBe(s.inst("guilmon").instanceId);
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === breedingPermanentId));
    const guilmon = s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === breedingPermanentId)!;
    expect(guilmon.topCard.instanceId).toBe(s.inst("guilmon").instanceId);
    expect(guilmon.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publicly hatches Gigimon and uses the zero-cost alternate route with the ordinary evolution draw", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT12-001", as: "gigimon" }],
        hand: [{ card: "EX4-006", as: "guilmon" }],
        deck: [
          { card: "BT1-013", as: "evolutionDraw" },
          { card: "BT1-012", as: "remaining" },
        ],
        security: ["BT1-013"],
      },
      1: { deck: ["BT1-013", "BT1-012"], security: ["BT1-013"] },
    });
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT12-001");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingPermanentId,
        instanceId: s.inst("guilmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX4-006");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("evolutionDraw").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("remaining").instanceId]);
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === breedingPermanentId));
    expect(s.perm("gigimon").topCard.instanceId).toBe(s.inst("guilmon").instanceId);
    expect(s.perm("gigimon").stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("rejects a public hatch from an incompatible blue egg without paying or moving cards", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "ST2-01", as: "tsunomon" }],
        hand: [{ card: "EX4-006", as: "guilmon" }],
        deck: ["BT1-013"],
        security: ["BT1-013"],
      },
      1: { deck: ["BT1-013"], security: ["BT1-013"] },
    });
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "ST2-01");
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingPermanentId,
        instanceId: s.inst("guilmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("ST2-01");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("guilmon").instanceId);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q3440/Q3441 grants persistent Rush from combined trashes and permits an immediate attack", async () => {
    const card = "BT1-010";
    const s = setupEngine({
      0: { hand: [{ card: "EX4-006", as: "guilmon" }], trash: Array(12).fill(card) },
      1: { trash: Array(8).fill(card), security: ["BT8-090"] },
    });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("guilmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX4-006"));
    const guilmon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX4-006")!;
    expect(observe(s.engine).hasKeyword(guilmon, "Rush")).toBe(true);

    s.state.players[0]!.trash.splice(0);
    s.state.players[1]!.trash.splice(0);
    expect(observe(s.engine).hasKeyword(guilmon, "Rush")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: guilmon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => guilmon.isSuspended);
    expect(guilmon.isSuspended).toBe(true);
  });

  it("does not grant Rush when the combined trashes total only 19 cards", async () => {
    const card = "BT1-010";
    const s = setupEngine({
      0: { hand: [{ card: "EX4-006", as: "guilmon" }], trash: Array(9).fill(card) },
      1: { trash: Array(10).fill(card) },
    });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("guilmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX4-006"));
    const guilmon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX4-006")!;

    expect(observe(s.engine).hasKeyword(guilmon, "Rush")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: guilmon.permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
  });
});
