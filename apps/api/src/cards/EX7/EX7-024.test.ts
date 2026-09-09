import { digivolutionRequirementsFor, EffectTiming, getCardDefinition, Phase, type CardInstance } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-024.js";
import "../index.js";
import "../BT22/BT22-036.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  expect(s.engine.applyIntent(seat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("EX7-024 Shoemon", () => {
  it("matches the catalog, Q&A coverage, complete IR, and standard evolution metadata", () => {
    expect(getCardDefinition("EX7-024")).toMatchObject({
      cardId: "EX7-024",
      nameEn: "Shoemon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Puppet", "LIBERATOR"],
      effectText:
        "[Your Turn] When this Digimon would digivolve into a Digimon card with the [Puppet] trait, reduce the digivolution cost by 1.",
      inheritedEffectText: "[Your Turn] All of your opponent's Security Digimon get -3000 DP.",
    });
    expect(digivolutionRequirementsFor("EX7-024")).toBeUndefined();
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "Replacement",
            event: "wouldDigivolve",
            sourceFilter: { isSelfRef: true, zone: ["battleArea"] },
            into: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }],
            },
            actions: [
              {
                kind: "Replacement",
                event: "wouldDigivolve",
                mode: "reduceCost",
                amount: 1,
                raw: "reduce the digivolution cost by 1",
              },
            ],
          },
        ],
      },
      {
        trigger: "YourTurn",
        actions: [{ kind: "ModifySecurityDP", controller: "opponent", amount: -3000, duration: "permanent" }],
        isInherited: true,
      },
    ]);
  });

  it("publicly reduces a legal Puppet evolution to cost 2, draws, and preserves exact stack identity (Q4882)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-024", as: "shoemon" }],
        hand: [{ card: "EX7-025", as: "shoeshoemon" }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { deck: ["BT1-011"], security: ["BT1-014"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    const sourceInstanceId = s.perm("shoemon").topCard!.instanceId;
    const drawInstanceId = s.state.players[0]!.deck[0]!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("shoemon").permanentId,
        instanceId: s.inst("shoeshoemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shoemon").topCard?.instanceId === s.inst("shoeshoemon").instanceId);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(drawInstanceId);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.perm("shoemon").stack.map(({ instanceId }) => instanceId)).toEqual([sourceInstanceId]);
    expect(s.perm("shoemon").topCard?.cardId).toBe("EX7-025");
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
    await stopLoop(s, loop, 0);
  });

  it("applies the Shoemon reduction to BT22-036's public Hand effect for exact cost 2 (Q4882)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX7-024", as: "shoemon" },
          { card: "EX7-063", as: "arisa" },
        ],
        hand: [{ card: "BT22-036", as: "chaperomon" }],
        trash: [{ card: "BT22-032", as: "shoeshoemon" }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { deck: ["BT1-011"], security: ["BT1-014"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const source = (
      s.engine as unknown as { cardSourceOf(card: CardInstance): Parameters<typeof effectsOf>[1] }
    ).cardSourceOf(s.inst("chaperomon"));
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source)[0]!.effectKey;
    const drawInstanceId = s.state.players[0]!.deck[0]!.instanceId;
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("chaperomon").instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shoemon").topCard?.instanceId === s.inst("chaperomon").instanceId);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(drawInstanceId);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.perm("shoemon").stack.map(({ cardId }) => cardId)).toEqual(["BT22-032", "EX7-024"]);
    expect(s.perm("shoemon").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("shoeshoemon").instanceId,
      s.inst("shoemon").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(
      s.inst("shoeshoemon").instanceId,
    );
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
    await stopLoop(s, loop, 0);
  });

  it("does not reduce a legal non-Puppet evolution, while still drawing and stacking it", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-024", as: "shoemon" }],
        hand: [{ card: "BT1-051", as: "reppamon" }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { deck: ["BT1-011"], security: ["BT1-014"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    const sourceInstanceId = s.perm("shoemon").topCard!.instanceId;
    const drawInstanceId = s.state.players[0]!.deck[0]!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("shoemon").permanentId,
        instanceId: s.inst("reppamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shoemon").topCard?.instanceId === s.inst("reppamon").instanceId);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(drawInstanceId);
    expect(s.perm("shoemon").stack.map(({ instanceId }) => instanceId)).toEqual([sourceInstanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
    await stopLoop(s, loop, 0);
  });

  it("keeps the Your Turn reduction inactive in breeding (Q3845) through a public two-step evolution", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "EX7-003", as: "egg" }],
        hand: [
          { card: "EX7-024", as: "shoemon" },
          { card: "EX7-025", as: "shoeshoemon" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: { deck: ["BT1-012"], security: ["BT1-014"] },
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX7-003");
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    await advance(s.engine).waitForMainPhase(0);
    const firstDrawInstanceId = s.state.players[0]!.deck[0]!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingPermanentId,
        instanceId: s.inst("shoemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("shoemon").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(firstDrawInstanceId);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-010", "BT1-011"]);

    s.state.memory = 5;
    const secondDrawInstanceId = s.state.players[0]!.deck[0]!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingPermanentId,
        instanceId: s.inst("shoeshoemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("shoeshoemon").instanceId);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(secondDrawInstanceId);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-011"]);
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([
      eggInstanceId,
      s.inst("shoemon").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
    await stopLoop(s, loop, 0);
  });

  it("applies inherited -3000 to opposing Security Digimon only during the owner's real turns", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["EX7-024"] }],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
      },
      1: {
        battleArea: [{ card: "BT1-014", as: "opponent" }],
        security: ["BT1-014"],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).securityDp(1)).toBe(-3000);
    expect(observe(s.engine).securityDp(0)).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.events.find((event) => event.kind === "securityChecked")).toMatchObject({
      revealedCardId: "BT1-014",
      battle: { attackerDeleted: false, securityDigimonDeleted: true },
    });
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("host").permanentId)).toBe(
      true,
    );

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).securityDp(1)).toBe(0);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).securityDp(1)).toBe(-3000);
    await stopLoop(s, loop, 0);
  });

  it("rejects a wrong-color and wrong-level source without paying, drawing, or mutating the stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "wrongSource" }],
        hand: [{ card: "EX7-025", as: "shoeshoemon" }],
        deck: ["BT1-009"],
      },
      1: { deck: ["BT1-010"], security: ["BT1-011"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    const handBefore = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    const deckBefore = s.state.players[0]!.deck.map(({ instanceId }) => instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongSource").permanentId,
        instanceId: s.inst("shoeshoemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(handBefore);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(deckBefore);
    expect(s.perm("wrongSource").topCard?.cardId).toBe("BT1-014");
    expect(s.perm("wrongSource").stack).toHaveLength(0);
    assertNoLoudGap(s);
    await stopLoop(s, loop, 0);
  });
});
