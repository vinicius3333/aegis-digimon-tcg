import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const cardId = "EX11-032";

describe("EX11-032 GrandGalemon", () => {
  it("preserves printed stats and the hand, digivolving, and inherited effects", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "GrandGalemon",
      colors: ["Green"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [{ color: "Green", level: 4, memoryCost: 3 }],
      types: ["Bird Dragon", "Vortex Warriors", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([]);
    expect(digivolutionRequirementsFor(cardId)).toEqual([]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Main",
        isFromHand: true,
        actions: [
          expect.objectContaining({
            kind: "Digivolve",
            costOverride: 3,
            ignoreRequirements: true,
            cost: expect.objectContaining({ kind: "place", position: "bottom" }),
          }),
        ],
      }),
    );
    const digivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")!;
    expect(digivolving.actions[0]).toMatchObject({
      kind: "Suspend",
      target: { filter: { controllerDefault: "any", kind: ["Digimon"] } },
    });
    expect(digivolving.actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      dpCeilingModifier: { mode: "raiseCeiling", amount: 1000 },
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenBattleWon" })],
      }),
    );
  });

  it("may suspend either player's Digimon and plays only an eligible green Bird card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [
            { card: "BT16-007", as: "bird" },
            { card: "BT1-009", as: "plain" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponent").topCard.instanceId, s.inst("bird").instanceId);
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    expect([s.perm("source"), s.perm("opponent")].filter(({ isSuspended }) => isSuspended)).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT16-007")).toBe(true);
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toContain("BT1-009");
    assertNoLoudGap(s);
  });

  it("uses the hand Main route by placing Galemon under a Pteromon, then digivolving for 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX11-026", as: "pteromon" },
          { card: "EX11-062", as: "shoto" },
        ],
        hand: [{ card: cardId, as: "grand" }],
        trash: [{ card: "EX11-028", as: "galemon" }],
      },
    });
    await s.ready();
    s.state.memory = 3;
    const source = (
      s.engine as unknown as { cardSourceOf(card: object): Parameters<typeof effectsOf>[1] }
    ).cardSourceOf(s.inst("grand"));
    const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) =>
      entry.effectKey.startsWith(`${cardId}/`),
    );
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: source.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("pteromon").topCard.cardId === cardId);
    expect(s.perm("pteromon").stack.map(({ cardId: id }) => id)).toEqual(["EX11-028", "EX11-026"]);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("inherits an optional once-per-turn unsuspend when its own host wins a battle", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX11-033", as: "host", under: [cardId], suspended: true }] } },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 0;
    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("host").permanentId });
    expect(s.perm("host").isSuspended).toBe(false);
    s.perm("host").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("host").permanentId });
    expect(s.perm("host").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });
});
