import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
import { compiled } from "./EX13-055.js";

const CARD_ID = "EX13-055";

// Fixtures, and why each one is here:
//   BT13-063 Dorumon      Black Lv.3 [Beast]/[X Antibody], NO [Chronicle], no printed text. It
//                         matches the header's NAME half only, so it separates the two compiled
//                         requirements.
//   BT20-010 Ryudamon     RED/Black Lv.3 [Chronicle]. The mirror image: it matches the colourless
//                         "Lv.3 w/[Chronicle] trait" half and is not named [Dorumon]. Red is a
//                         colour no printed EvoCost on this card admits, which is exactly what
//                         the colourless compiled entry is for.
//   BT2-052  Hagurumon    Black Lv.3, no [Chronicle], not named [Dorumon], no printed text — the
//                         illegal-source negative that the printed EvoCost still reaches.
//   BT20-053 Grademon     Black/Yellow Lv.5 [Chronicle] — the legal [When Attacking] destination.
//   BT9-064  Grademon     Black Lv.5 [Warrior]/[X Antibody] with NO [Chronicle] — the near miss:
//                         same name, same level, same colour, wrong trait.
//   BT1-009..BT1-014      inert main-deck Digimon — deck filler, hosts and attack victims.
const NAME_ONLY_SOURCE = "BT13-063";
const TRAIT_ONLY_SOURCE = "BT20-010";
const NEITHER_SOURCE = "BT2-052";
const CHRONICLE_LV5 = "BT20-053";
const NON_CHRONICLE_LV5 = "BT9-064";
const NON_MATCH = "BT1-009";

/** Fire this card's own [When Attacking] window through the injected timing seam. */
async function attackWindow(s: ReturnType<typeof setupEngine>, alias: string): Promise<void> {
  await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm(alias), {
    attackerPermanentId: s.perm(alias).permanentId,
  });
}

describe("EX13-055 Raptordramon", () => {
  it("matches the catalog printed text, stats and evolution costs", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Raptordramon",
      colors: ["Black", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Cyborg", "X Antibody", "Chronicle"],
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 3 },
        { color: "Yellow", level: 3, memoryCost: 3 },
      ],
      effectText:
        "[Digivolve] [Dorumon]/Lv.3 w/[Chronicle] trait: Cost 2 \n\n[On Play] [When Digivolving] 1 of your opponent's Digimon gets -3000 DP for the turn.\n[When Attacking] This Digimon may digivolve into a Digimon card with the [Chronicle] trait in the hand or trash.",
    });
    expect((getCardDefinition(CARD_ID)?.inheritedEffectText ?? "").trim()).toBe("＜Barrier＞");
  });

  it("compiles every printed clause", () => {
    expect(runtimeCompiledCard(CARD_ID)).toMatchObject({ coverage: "full", residual: [] });

    expect(digivolutionRequirementsFor(CARD_ID)).toEqual([
      { namesExact: ["Dorumon"], cost: 2, isAlternate: true },
      // Deliberately colourless: the printed header names no colour.
      { level: 3, traits: ["Chronicle"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.assemblyRequirement).toBeUndefined();

    const debuff = {
      kind: "ModifyDP",
      target: { filter: { controller: "opponent", kind: ["Digimon"], zone: "battleArea" }, count: 1 },
      amount: -3000,
      duration: "forTheTurn",
    };
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.isInherited).toBeUndefined();
      expect(effect.frequency).toBeUndefined();
      expect(effect.actions).toMatchObject([debuff]);
    }

    // No [Once Per Turn] is printed on the [When Attacking] clause, so it carries no frequency.
    const attacking = compiled.effects.find((effect) => effect.trigger === "WhenAttacking")!;
    expect(attacking.frequency).toBeUndefined();
    expect(attacking.actions).toMatchObject([
      {
        kind: "Digivolve",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        into: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
        },
        from: ["hand", "trash"],
        payCost: true,
        optional: true,
      },
    ]);

    const inherited = compiled.effects.find((effect) => effect.isInherited)!;
    expect(inherited).toMatchObject({
      trigger: "Static",
      isInherited: true,
      actions: [],
      keywords: [{ keyword: "Barrier" }],
    });
  });

  // ---------------------------------------------------------------------------
  // [Digivolve] [Dorumon]/Lv.3 w/[Chronicle] trait: Cost 2
  // ---------------------------------------------------------------------------

  it("takes the [Dorumon] half for 2 and refuses the [Chronicle] half on the same source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NAME_ONLY_SOURCE, as: "base" }],
          hand: [{ card: CARD_ID, as: "raptor" }],
          deck: [{ card: NON_MATCH, as: "bonusDraw" }, "BT1-010"],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "victim", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("raptor").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("base").instanceId]);
    // The [When Digivolving] half of the shared clause resolved on the way in.
    expect(s.perm("victim").currentDP).toBe(6000);

    const wrongHalf = setupEngine({
      0: {
        battleArea: [{ card: NAME_ONLY_SOURCE, as: "base" }],
        hand: [{ card: CARD_ID, as: "raptor" }],
        deck: [NON_MATCH, "BT1-010"],
      },
    });
    wrongHalf.state.memory = 5;
    await wrongHalf.ready();

    expect(
      wrongHalf.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongHalf.perm("base").permanentId,
        instanceId: wrongHalf.inst("raptor").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(wrongHalf.perm("base").topCard.cardId).toBe(NAME_ONLY_SOURCE);
    expect(wrongHalf.state.memory).toBe(5);
  });

  it("takes the colourless Lv.3 [Chronicle] half for 2 from a RED source no EvoCost admits", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TRAIT_ONLY_SOURCE, as: "base" }],
          hand: [{ card: CARD_ID, as: "raptor" }],
          deck: [{ card: NON_MATCH, as: "bonusDraw" }, "BT1-010"],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "victim", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("raptor").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID);
    await settle(() => s.state.pendingDecision === undefined);

    // 5 - 2 + 1: BT20-010 prints its own "[Your Turn] When this Digimon would digivolve into ...
    // a Digimon card with the [Chronicle] trait, reduce the digivolution cost by 1", and this
    // card carries [Chronicle], so the header's 2 is charged as 1.
    expect(s.state.memory).toBe(4);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.perm("victim").currentDP).toBe(6000);

    // The name half refuses the same source: "Ryudamon" is not "Dorumon".
    const wrongHalf = setupEngine({
      0: {
        battleArea: [{ card: TRAIT_ONLY_SOURCE, as: "base" }],
        hand: [{ card: CARD_ID, as: "raptor" }],
        deck: [NON_MATCH, "BT1-010"],
      },
    });
    wrongHalf.state.memory = 5;
    await wrongHalf.ready();

    expect(
      wrongHalf.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongHalf.perm("base").permanentId,
        instanceId: wrongHalf.inst("raptor").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(wrongHalf.perm("base").topCard.cardId).toBe(TRAIT_ONLY_SOURCE);
    expect(wrongHalf.state.memory).toBe(5);
  });

  it("refuses both header halves for a plain Black Lv.3 and charges the printed 3 instead", async () => {
    for (const alternateRequirementIndex of [0, 1]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: NEITHER_SOURCE, as: "base" }],
          hand: [{ card: CARD_ID, as: "raptor" }],
          deck: [NON_MATCH, "BT1-010"],
        },
      });
      s.state.memory = 5;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("raptor").instanceId,
          useAlternateCost: true,
          alternateRequirementIndex,
        }),
      ).toEqual(expect.objectContaining({ ok: false }));
      expect(s.perm("base").topCard.cardId).toBe(NEITHER_SOURCE);
      expect(s.state.memory).toBe(5);
    }

    const printedRoute = setupEngine(
      {
        0: {
          battleArea: [{ card: NEITHER_SOURCE, as: "base" }],
          hand: [{ card: CARD_ID, as: "raptor" }],
          deck: [{ card: NON_MATCH, as: "bonusDraw" }, "BT1-010"],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "victim", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    printedRoute.state.memory = 5;
    await printedRoute.ready();

    expect(
      printedRoute.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: printedRoute.perm("base").permanentId,
        instanceId: printedRoute.inst("raptor").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => printedRoute.perm("base").topCard.cardId === CARD_ID);
    expect(printedRoute.state.memory).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // [On Play] [When Digivolving] 1 of your opponent's Digimon gets -3000 DP for the turn.
  // ---------------------------------------------------------------------------

  it("drops exactly one opposing Digimon by 3000 on play, never its own board, and expires at turn end", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "raptor" }],
          battleArea: [{ card: NON_MATCH, as: "ally", dp: 9000 }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-013"],
        },
        1: {
          battleArea: [
            { card: NON_MATCH, as: "first", dp: 9000 },
            { card: "BT1-012", as: "second", dp: 9000 },
          ],
          deck: ["BT1-013"],
          security: ["BT1-014"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("raptor").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    await settle(() => [s.perm("first"), s.perm("second")].some(({ currentDP }) => currentDP === 6000));

    expect([s.perm("first").currentDP, s.perm("second").currentDP].sort((a, b) => a - b)).toEqual([6000, 9000]);
    expect(s.perm("ally").currentDP).toBe(9000);
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);

    // "for the turn": a real opponent turn passes and the debuff is gone.
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect([s.perm("first").currentDP, s.perm("second").currentDP]).toEqual([9000, 9000]);
  });

  // ---------------------------------------------------------------------------
  // [When Attacking] digivolve into a [Chronicle] Digimon card in the hand or trash.
  // ---------------------------------------------------------------------------

  it("digivolves mid-attack into a [Chronicle] card in HAND and keeps the attacker's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "raptor", under: ["BT1-010"], dp: 5000 }],
          hand: [{ card: CHRONICLE_LV5, as: "grademon" }],
          deck: [{ card: NON_MATCH, as: "bonusDraw" }, "BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "bystander", dp: 9000 }], deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    await s.ready();
    const raptorId = s.perm("raptor").permanentId;

    await attackWindow(s, "raptor");
    await settle(() => s.perm("raptor").topCard.cardId === CHRONICLE_LV5);
    await settle(() => s.state.pendingDecision === undefined);

    // Same permanent, one card taller: the attacker digivolved in place.
    expect(s.perm("raptor").permanentId).toBe(raptorId);
    expect(s.perm("raptor").stack).toHaveLength(2);
    expect(s.perm("raptor").stack.map(({ cardId }) => cardId)).toEqual(["BT1-010", CARD_ID]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).not.toContain(CHRONICLE_LV5);
    // `payCost: true`: the destination's printed Black Lv.4 EvoCost of 4 was charged from 6.
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("digivolves mid-attack into a [Chronicle] card in the TRASH", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "raptor", under: ["BT1-010"], dp: 5000 }],
          trash: [{ card: CHRONICLE_LV5, as: "grademon" }],
          hand: [{ card: "BT1-014", as: "spare" }],
          deck: [{ card: NON_MATCH, as: "bonusDraw" }, "BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "bystander", dp: 9000 }], deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    await s.ready();

    await attackWindow(s, "raptor");
    await settle(() => s.perm("raptor").topCard.cardId === CHRONICLE_LV5);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("raptor").stack.map(({ cardId }) => cardId)).toEqual(["BT1-010", CARD_ID]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("grademon").instanceId);
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("refuses a same-name Lv.5 without the [Chronicle] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "raptor", under: ["BT1-010"], dp: 5000 }],
          hand: [{ card: NON_CHRONICLE_LV5, as: "nearMiss" }],
          deck: [NON_MATCH, "BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "bystander", dp: 9000 }], deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    await attackWindow(s, "raptor");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("raptor").topCard.cardId).toBe(CARD_ID);
    expect(s.perm("raptor").stack.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("nearMiss").instanceId]);
    expect(s.state.memory).toBe(6);
  });

  it("leaves the attacker alone when the controller declines the optional digivolve", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "raptor", under: ["BT1-010"], dp: 5000 }],
          hand: [{ card: CHRONICLE_LV5, as: "grademon" }],
          deck: [NON_MATCH, "BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "bystander", dp: 9000 }], deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    await attackWindow(s, "raptor");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("raptor").topCard.cardId).toBe(CARD_ID);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("grademon").instanceId]);
    expect(s.state.memory).toBe(6);
  });

  // ---------------------------------------------------------------------------
  // Inherited ＜Barrier＞
  // ---------------------------------------------------------------------------

  it("grants inherited ＜Barrier＞ only from inside another Digimon's stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-014", as: "host", under: [{ card: CARD_ID, as: "source" }] },
          { card: "BT1-013", as: "bystander" },
        ],
        deck: ["BT1-011", "BT1-012"],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("bystander"), "Barrier")).toBe(false);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("source").instanceId]);
  });

  it("does not give its own top card ＜Barrier＞ — the keyword is printed only in inherited text", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "raptor" }], deck: ["BT1-011", "BT1-012"] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("raptor"), "Barrier")).toBe(false);
  });
});
