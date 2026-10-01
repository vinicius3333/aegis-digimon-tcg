import { describe, it, expect } from "vitest";
import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter/matching/definition.js";
import { makeInstance as instance, setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT11-089.js";
import "./BT11-016.js";

describe("BT11-089 [On Play] reveal 4 -> add 1 red Vaccine Digimon to hand", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-089")).toMatchObject({
      cardId: "BT11-089",
      colors: ["Red"],
      kinds: ["Tamer"],
      playCost: 3,
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 4 }] },
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenPlayed",
            sourceFilter: { excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "traitContains" }] },
          },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost" }] },
    ]);
  });

  it("moves the selected red/Vaccine Digimon to hand, not the deck bottom", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;

    const source = instance("BT11-089", 0, false);
    p0.hand.push(source);
    s.state.memory = 10;

    p0.deck.push(instance("AD1-004", 0, false));
    p0.deck.push(instance("BT1-009", 0, false));
    p0.deck.push(instance("BT1-009", 0, false));
    p0.deck.push(instance("BT1-009", 0, false));

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });

    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT11-089"), 200);
    await settle(() => false, 60);

    expect(p0.hand.some((c) => c.cardId === "AD1-004")).toBe(true);
    expect(p0.deck.some((c) => c.cardId === "AD1-004")).toBe(false);
  });

  it("suspends itself to give Rush to the first eligible effect play each turn", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT11-089", as: "akiho" },
            { card: "BT1-013", as: "spare" },
            { card: "BT11-016", as: "phoenix1" },
            { card: "BT11-016", as: "phoenix2" },
            { card: "BT11-016", as: "phoenix3" },
          ],
          hand: [
            { card: "BT1-012", as: "biyomon1" },
            { card: "BT1-012", as: "biyomon2" },
            { card: "BT1-012", as: "biyomon3" },
          ],
          deck: Array.from({ length: 8 }, () => "BT1-013"),
          security: Array.from({ length: 4 }, () => "BT1-013"),
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "titan", dp: 13000, suspended: true }],
          deck: Array.from({ length: 8 }, () => "BT1-013"),
          security: Array.from({ length: 4 }, () => "BT1-013"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const titanId = s.perm("titan").permanentId;
    const phoenixIds = [s.perm("phoenix1").permanentId, s.perm("phoenix2").permanentId, s.perm("phoenix3").permanentId];

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    for (const [index, phoenixId] of phoenixIds.slice(0, 2).entries()) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: phoenixId,
          target: { kind: "permanent", permanentId: titanId },
        }),
      ).toEqual({ ok: true });
      await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === phoenixId));
      const biyomonInstanceId = s.inst(index === 0 ? "biyomon1" : "biyomon2").instanceId;
      await settle(
        () =>
          !observe(s.engine).isAttacking() &&
          s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === biyomonInstanceId),
      );
    }
    expect(s.perm("akiho").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("biyomon1"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("biyomon2"), "Rush")).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: titanId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("akiho").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: phoenixIds[2]!,
        target: { kind: "permanent", permanentId: titanId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === phoenixIds[2]));
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-012"),
    );
    expect(observe(s.engine).hasKeyword(s.perm("biyomon3"), "Rush")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("does not react to a red Sea Animal genuinely played by an effect", async () => {
    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT11-089", as: "akiho" }],
          hand: [{ card: "BT14-008", as: "sea-animal" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("sea-animal").instanceId], "BT11-089");

    expect(s.perm("akiho").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("sea-animal"), "Rush")).toBe(false);
  });
});

describe("BT11-089 Akiho Rindou — KB Q&A rulings", () => {
  it("matches any trait containing Avian, Bird, Beast, Animal or Sovereign regardless of other words, except Sea Animal (Q2115)", async () => {
    async function rushAfterEffectPlay(cardId: string) {
      const s = setup(
        { 0: { battleArea: [{ card: "BT11-089", as: "akiho" }], hand: [{ card: cardId, as: "played" }] } },
        { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true },
      );
      await s.ready();
      await advance(s.engine).verb.playInstances([s.inst("played").instanceId], "BT11-089");
      return {
        akihoSuspended: s.perm("akiho").isSuspended,
        rush: observe(s.engine).hasKeyword(s.perm("played"), "Rush"),
      };
    }
    const traitsOf = (cardId: string) => getCardDefinition(cardId)?.types;

    const compoundTraitCards: [string, string[]][] = [
      ["BT1-014", ["Giant Bird"]],
      ["BT1-022", ["Birdkin"]],
      ["BT16-033", ["Mythical Beast"]],
      ["BT15-071", ["Dark Animal", "X Antibody", "SoC"]],
      ["BT8-019", ["Holy Bird", "Four Sovereigns"]],
    ];
    for (const [cardId, traits] of compoundTraitCards) {
      expect(traitsOf(cardId)).toEqual(traits);
      await expect(rushAfterEffectPlay(cardId)).resolves.toEqual({ akihoSuspended: true, rush: true });
    }

    expect(traitsOf("BT14-008")).toEqual(["Sea Animal"]);
    await expect(rushAfterEffectPlay("BT14-008")).resolves.toEqual({ akihoSuspended: false, rush: false });

    // No red Digimon prints a Sovereign trait without a Bird trait, so check the plural
    // "Sovereigns" in isolation against the card's own trait filter.
    const rushWatcher = compiled.effects[1]!.actions[0]!;
    if (rushWatcher.kind !== "SubTrigger") throw new Error("expected the Rush watcher SubTrigger");
    const [includedTraits] = rushWatcher.sourceFilter?.nameOrTrait ?? [];
    const [excludedTraits] = rushWatcher.sourceFilter?.excludeNameOrTrait ?? [];
    const withTraits = (types: string[]) => ({ nameEn: "Trait fixture", types });
    expect(matchNameOrTrait(withTraits(["Four Sovereigns"]), includedTraits!)).toBe(true);
    expect(matchNameOrTrait(withTraits(["Four Great Dragons"]), includedTraits!)).toBe(false);
    expect(matchNameOrTrait(withTraits(["Sea Animal"]), excludedTraits!)).toBe(true);
  });
});
