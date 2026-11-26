import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "BD03-07";
const grandGalemon = "BD03-05";
const galemon = "BD03-04";
const pteromon = "BD03-03";
const blackLevel5Blocker = "BT2-061";
const purpleBlocker = "BT2-072";
const blackWithoutBlocker = "BT13-066";
const filler = "BT1-009";
const untouched = "BT1-010";

function revealBoard(top: { card: string; as: string }[]) {
  return {
    0: {
      battleArea: [{ card: cardId, as: "zephagamon" }],
      deck: [...top, { card: untouched, as: "untouched" }],
      security: [filler],
    },
    1: { security: [filler, filler] },
  };
}

function battleAreaInstanceIds(s: ReturnType<typeof setupEngine>) {
  return s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId).sort();
}

describe("BD03-07 Zephagamon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD03",
      nameEn: "Zephagamon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Magic Knight", "Vortex Warriors"],
      rarity: "SR",
      effectText:
        "＜Blocker＞ (This Digimon can block in the blocker timing.)\n[All Turns][Once Per Turn] When this Digimon suspends, reveal the top 2 cards of your deck. You may play 1 black level 4 or lower Digimon card with ＜Blocker＞ among them without paying the cost. Return the rest to the bottom of the deck.\n[Rule] Trait: Has [Bird Dragon] Type.",
    });
    expect(getCardDefinition(cardId)!.inheritedEffectText).toBeUndefined();
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("has the Bird Dragon trait from its Rule line in every zone", () => {
    expect(cardHasTrait(cardId, "Bird Dragon")).toBe(true);
    expect(cardHasTrait(cardId, "Magic Knight")).toBe(true);
    expect(cardHasTrait(cardId, "Dragon")).toBe(false);
  });

  it("digivolves from GrandGalemon for 4 memory with Blocker", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: grandGalemon, as: "base", under: [galemon] }],
        hand: [{ card: cardId, as: "zephagamon" }],
        deck: [filler],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("zephagamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId);

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([galemon, grandGalemon]);
    expect(s.perm("base").currentDP).toBe(13000);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
  });

  it("plays a revealed black level 4 Blocker for free when it suspends to attack and returns the rest to the bottom", async () => {
    const s = setupEngine(
      revealBoard([
        { card: galemon, as: "freePlay" },
        { card: filler, as: "rest" },
      ]),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zephagamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2 && !observe(s.engine).isAttacking());

    expect(battleAreaInstanceIds(s)).toEqual([s.inst("zephagamon").instanceId, s.inst("freePlay").instanceId].sort());
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("untouched").instanceId,
      s.inst("rest").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it("offers only black level 4 or lower Digimon with Blocker", async () => {
    const s = setupEngine(
      {
        ...revealBoard([]),
        0: {
          battleArea: [{ card: cardId, as: "zephagamon" }],
          deck: [
            { card: pteromon, as: "match" },
            { card: blackLevel5Blocker, as: "tooHigh" },
            { card: untouched, as: "untouched" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("zephagamon").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.length === 2 && s.state.pendingDecision === undefined);

    const selection = s.decisions.find((decision) => decision.req.kind === "selectCards");
    expect(selection?.req.options?.candidateInstanceIds).toEqual([s.inst("match").instanceId]);
    expect(battleAreaInstanceIds(s)).toEqual([s.inst("zephagamon").instanceId, s.inst("match").instanceId].sort());
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("untouched").instanceId,
      s.inst("tooHigh").instanceId,
    ]);
  });

  it("plays nothing when only near misses are revealed", async () => {
    for (const rejected of [blackLevel5Blocker, purpleBlocker, blackWithoutBlocker]) {
      const s = setupEngine(
        revealBoard([
          { card: rejected, as: "rejected" },
          { card: filler, as: "rest" },
        ]),
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();

      await advance(s.engine).verb.suspend([s.perm("zephagamon").permanentId]);
      await settle(() => s.state.players[0]!.deck[0]?.instanceId === s.inst("untouched").instanceId);
      await settle(() => s.state.pendingDecision === undefined);

      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([cardId]);
      expect(s.state.players[0]!.deck).toHaveLength(3);
      expect(s.state.players[0]!.trash).toHaveLength(0);
    }
  });

  it("returns both cards to the bottom when the optional play is declined", async () => {
    const s = setupEngine(
      revealBoard([
        { card: galemon, as: "declined" },
        { card: filler, as: "rest" },
      ]),
      { autoSelectCards: false },
    );
    await s.ready();

    const suspension = advance(s.engine).verb.suspend([s.perm("zephagamon").permanentId]);
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await suspension;
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 3);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([cardId]);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("untouched").instanceId);
    expect(
      s.state.players[0]!.deck.slice(1)
        .map((card) => card.instanceId)
        .sort(),
    ).toEqual([s.inst("declined").instanceId, s.inst("rest").instanceId].sort());
  });

  it("reveals only once per turn and also on the opponent's turn", async () => {
    const s = setupEngine(
      revealBoard([
        { card: pteromon, as: "first" },
        { card: filler, as: "rest" },
        { card: galemon, as: "second" },
      ]),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("zephagamon").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.length === 2 && s.state.pendingDecision === undefined);
    await advance(s.engine).verb.unsuspend([s.perm("zephagamon").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("zephagamon").permanentId]);
    await settle();

    expect(battleAreaInstanceIds(s)).toEqual([s.inst("zephagamon").instanceId, s.inst("first").instanceId].sort());
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("second").instanceId);
  });

  it("does not reveal when another of your Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "zephagamon" },
            { card: filler, as: "ally" },
          ],
          deck: [
            { card: galemon, as: "top" },
            { card: filler, as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("top").instanceId);
  });
});
