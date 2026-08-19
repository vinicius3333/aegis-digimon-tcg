import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX3-027.js";
import "./EX3-035.js";
import "./EX3-069.js";
import "../index.js"; // the full catalog is registered in a real match

describe("EX3-027 Agumon", () => {
  it("has the official identity, inherited text, and digivolves from yellow level 2 for 0", async () => {
    const definition = getCardDefinition("EX3-027")!;
    expect(definition).toMatchObject({
      cardId: "EX3-027",
      nameEn: "Agumon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Reptile"],
      rarity: "C",
      imageId: "EX3-027",
    });
    expect(definition.effectText).toBeUndefined();
    expect(definition.inheritedEffectText).toBe(
      "[Your Turn][Once Per Turn] When you play a Digimon with [Four Great Dragons] in its traits or place [Trial of the Four Great Dragons] in your battle area, ＜Draw 1＞.",
    );

    const s = setupEngine({
      0: {
        breeding: { card: "BT1-005", as: "base" },
        hand: [{ card: "EX3-027", as: "agumon" }],
        deck: [{ card: "BT1-001", as: "evolutionDraw" }],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("agumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-027");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("evolutionDraw").instanceId]);
  });

  it("draws exactly 1 from a public Four Great Dragons play and pays its printed cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-050", under: [{ card: "EX3-027" }], as: "host" }],
        hand: [{ card: "EX3-035", as: "dragon" }],
        deck: [
          { card: "BT1-049", as: "inheritedDraw" },
          { card: "BT1-048", as: "remaining" },
        ],
      },
    });
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("inheritedDraw").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("remaining").instanceId]);
  });

  it("public Trial play draws for its Main effect and once for the inherited placement watcher", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-050", under: [{ card: "EX3-027" }], as: "host" }],
        hand: [{ card: "EX3-069", as: "trial" }],
        deck: [
          { card: "BT1-049", as: "trialDraw" },
          { card: "BT1-048", as: "inheritedDraw" },
          { card: "BT1-047", as: "remaining" },
        ],
      },
    });
    s.state.memory = 8;
    await s.ready();
    const trialId = s.inst("trial").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: trialId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === trialId) &&
        s.state.players[0]!.deck.length === 1,
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("trialDraw").instanceId,
      s.inst("inheritedDraw").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).not.toContain("EX3-069");
  });

  it.each([
    ["Dragon then Trial", "dragon"],
    ["Trial then Dragon", "trial"],
  ])("shares Once Per Turn across both trigger families: %s", async (_label, first) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-050", under: [{ card: "EX3-027" }], as: "host" }],
        hand: [
          { card: "EX3-035", as: "dragon" },
          { card: "EX3-069", as: "trial" },
        ],
        deck: ["BT1-049", "BT1-048", "BT1-047", "BT1-046"],
      },
    });
    s.state.memory = 20;
    await s.ready();

    const play = (alias: "dragon" | "trial") =>
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(alias).instanceId });
    expect(play(first as "dragon" | "trial")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === (first === "trial" ? 2 : 3));
    expect(play(first === "dragon" ? "trial" : "dragon")).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-069") &&
        s.state.players[0]!.deck.length === 2,
    );

    // Trial always draws 1 itself; the inherited effect contributes exactly 1 total.
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("resets Once Per Turn on the controller's next turn after repeated recomputes", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-050", under: [{ card: "EX3-027" }], as: "host" }],
        hand: [
          { card: "EX3-035", as: "firstDragon" },
          { card: "EX3-035", as: "secondDragon" },
        ],
        deck: ["BT1-049", "BT1-048", "BT1-047"],
      },
      1: { deck: ["BT1-001", "BT1-002", "BT1-003"] },
    });
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const firstTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.phase === Phase.Main);
    s.state.memory = 24;

    await advance(s.engine).recompute();
    await advance(s.engine).recompute();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstDragon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 0;
    const opponentTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 12;
    const nextTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondDragon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 1);

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await nextTurn;
  });

  it("two inherited copies independently draw once without duplicate subscriptions", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-050", under: [{ card: "EX3-027" }], as: "firstHost" },
          { card: "BT1-051", under: [{ card: "EX3-027" }], as: "secondHost" },
        ],
        hand: [
          { card: "EX3-035", as: "dragon" },
          { card: "EX3-069", as: "trial" },
        ],
        deck: ["BT1-049", "BT1-048", "BT1-047", "BT1-046", "BT1-045"],
      },
    });
    s.state.memory = 20;
    await s.ready();
    await advance(s.engine).recompute();
    await advance(s.engine).recompute();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 3);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trial").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-069") &&
        s.state.players[0]!.deck.length === 2,
    );

    // Two inherited copies draw twice from the first event. Trial draws only its own 1 later;
    // both inherited ledgers are already spent, and recomputation did not duplicate either.
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("Q3664 treats a simultaneous multi-play as one activation and filters unrelated subjects", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-050", under: [{ card: "EX3-027" }], as: "host" }],
        hand: [
          // [Four Great Dragons] Digimon whose own printed effects never touch the deck, so
          // the deck count below measures Agumon's inherited draw alone.
          { card: "BT3-029", as: "firstDragon" },
          { card: "BT3-029", as: "secondDragon" },
          { card: "BT1-049", as: "unrelated" },
        ],
        deck: ["BT1-049", "BT1-048"],
      },
    });
    await s.ready();

    await advance(s.engine).verb.playInstances([
      s.inst("firstDragon").instanceId,
      s.inst("secondDragon").instanceId,
      s.inst("unrelated").instanceId,
    ]);
    await settle(() => s.state.players[0]!.deck.length === 1);

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("does not install the inherited watcher while EX3-027 is only the top card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-027", as: "topAgumon" }],
        hand: [{ card: "EX3-035", as: "dragon" }],
        deck: [
          { card: "BT1-049", as: "wouldBeDrawn" },
          { card: "BT1-048", as: "remaining" },
        ],
      },
    });
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-035"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("wouldBeDrawn").instanceId,
      s.inst("remaining").instanceId,
    ]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("resolves a valid inherited draw against an empty deck without creating a phantom card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-050", under: [{ card: "EX3-027" }], as: "host" }],
        hand: [{ card: "EX3-035", as: "dragon" }],
        deck: [],
      },
    });
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX3-027"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX3-035")).toHaveLength(1);
  });

  it("does not draw from the opponent's card, an unrelated Digimon, the opponent's turn, or Agumon on top", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-050", under: [{ card: "EX3-027" }], as: "inheritedHost" },
          { card: "EX3-027", as: "topAgumon" },
        ],
        hand: [
          { card: "BT1-049", as: "unrelated" },
          { card: "EX3-035", as: "dragonOnOpponentTurn" },
        ],
        deck: ["BT1-049", "BT1-048"],
      },
      1: { hand: [{ card: "EX3-035", as: "opponentDragon" }] },
    });
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("opponentDragon").instanceId]);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unrelated").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    s.state.turnSeat = 1;
    await advance(s.engine).verb.playInstances([s.inst("dragonOnOpponentTurn").instanceId]);
    await settle();

    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
