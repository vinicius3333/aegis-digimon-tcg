import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
import { compiled } from "./EX13-057.js";

const CARD_ID = "EX13-057";

const NAME_ONLY_SOURCE = "BT9-062";
const TRAIT_ONLY_SOURCE = "BT20-012";
const NEITHER_SOURCE = "BT2-056";
const CHRONICLE_LV3 = "BT20-048";
const X_ANTIBODY_LV3 = "BT13-063";
const NON_MATCH = "BT1-009";
const LV4_FEEDER = "EX13-055";
const CHRONICLE_LV6 = "BT20-056";
describe("EX13-057 Grademon", () => {
  it("matches the catalog printed text, stats and evolution costs", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Grademon",
      colors: ["Black", "Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Warrior", "X Antibody", "Chronicle"],
      evoCosts: [
        { color: "Black", level: 4, memoryCost: 4 },
        { color: "Yellow", level: 4, memoryCost: 4 },
      ],
      effectText:
        "[Digivolve] [Raptordramon]/Lv.4 w/[Chronicle] trait: Cost 3 \n\n[On Play] [When Digivolving] Until your opponent's turn ends, 1 of your [X Antibody] or [Chronicle] trait Digimon gains ＜Reboot＞ and ＜Blocker＞. If during an attack, it also isn't affected by their Digimon effects and gets +5000 DP.\n[End of Attack] [Once Per Turn] This Digimon may digivolve into a Digimon card with the [Chronicle] trait in the hand or trash.",
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When any of your [Chronicle] trait Digimon would leave the battle area, by trashing your top security card, they don't leave.",
    });
  });

  it("compiles every printed clause", () => {
    expect(runtimeCompiledCard(CARD_ID)).toMatchObject({ coverage: "full", residual: [] });

    expect(digivolutionRequirementsFor(CARD_ID)).toEqual([
      { namesExact: ["Raptordramon"], cost: 3, isAlternate: true },
      { level: 4, traits: ["Chronicle"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.assemblyRequirement).toBeUndefined();

    const recipient = {
      controller: "mine",
      kind: ["Digimon"],
      zone: "battleArea",
      nameOrTrait: [{ tokens: ["X Antibody", "Chronicle"], match: "trait" }],
    };
    const duringAttack = { kind: "duringAttack" };

    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.frequency).toBeUndefined();
      expect(effect.actions).toMatchObject([
        {
          kind: "GainKeyword",
          target: { filter: recipient, count: 1 },
          keyword: { keyword: "Reboot" },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GainKeyword",
          target: { filter: recipient, count: 1, sameTarget: true },
          keyword: { keyword: "Blocker" },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GrantImmunity",
          target: { filter: recipient, count: 1, sameTarget: true },
          immuneFrom: "opponentDigimonEffects",
          duration: "untilOpponentTurnEnd",
          condition: duringAttack,
        },
        {
          kind: "ModifyDP",
          target: { filter: recipient, count: 1, sameTarget: true },
          amount: 5000,
          duration: "untilOpponentTurnEnd",
          condition: duringAttack,
        },
      ]);
      expect(effect.actions).toHaveLength(4);
    }

    const endOfAttack = compiled.effects.find((effect) => effect.trigger === "EndOfAttack")!;
    expect(endOfAttack.frequency).toBe("OncePerTurn");
    expect(endOfAttack.actions).toMatchObject([
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
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          optional: true,
          affectsAll: true,
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
          },
          target: { count: "all" },
          cost: { kind: "trashSecurityTop" },
        },
      ],
    });
    expect((inherited.actions[0] as { leaveCause?: string }).leaveCause).toBeUndefined();
  });

  it("takes the [Raptordramon] half for 3 and refuses the [Chronicle] half on the same source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NAME_ONLY_SOURCE, as: "base" },
            { card: CHRONICLE_LV3, as: "ally" },
          ],
          hand: [{ card: CARD_ID, as: "grademon" }],
          deck: [{ card: NON_MATCH, as: "bonusDraw" }, "BT1-010"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("grademon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("base").instanceId]);

    const wrongHalf = setupEngine({
      0: {
        battleArea: [{ card: NAME_ONLY_SOURCE, as: "base" }],
        hand: [{ card: CARD_ID, as: "grademon" }],
        deck: [NON_MATCH, "BT1-010"],
      },
    });
    wrongHalf.state.memory = 6;
    await wrongHalf.ready();

    expect(
      wrongHalf.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongHalf.perm("base").permanentId,
        instanceId: wrongHalf.inst("grademon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(wrongHalf.perm("base").topCard.cardId).toBe(NAME_ONLY_SOURCE);
    expect(wrongHalf.state.memory).toBe(6);
  });

  it("takes the colourless Lv.4 [Chronicle] half for 3 from a RED source no EvoCost admits", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TRAIT_ONLY_SOURCE, as: "base" }],
          hand: [{ card: CARD_ID, as: "grademon" }],
          deck: [{ card: NON_MATCH, as: "bonusDraw" }, "BT1-010"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("grademon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(3);

    const wrongHalf = setupEngine({
      0: {
        battleArea: [{ card: TRAIT_ONLY_SOURCE, as: "base" }],
        hand: [{ card: CARD_ID, as: "grademon" }],
        deck: [NON_MATCH, "BT1-010"],
      },
    });
    wrongHalf.state.memory = 6;
    await wrongHalf.ready();
    expect(
      wrongHalf.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongHalf.perm("base").permanentId,
        instanceId: wrongHalf.inst("grademon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(wrongHalf.perm("base").topCard.cardId).toBe(TRAIT_ONLY_SOURCE);
    expect(wrongHalf.state.memory).toBe(6);
  });

  it("refuses both header halves for a plain Black Lv.4 and charges the printed 4 instead", async () => {
    for (const alternateRequirementIndex of [0, 1]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: NEITHER_SOURCE, as: "base" }],
          hand: [{ card: CARD_ID, as: "grademon" }],
          deck: [NON_MATCH, "BT1-010"],
        },
      });
      s.state.memory = 6;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("grademon").instanceId,
          useAlternateCost: true,
          alternateRequirementIndex,
        }),
      ).toEqual(expect.objectContaining({ ok: false }));
      expect(s.perm("base").topCard.cardId).toBe(NEITHER_SOURCE);
      expect(s.state.memory).toBe(6);
    }

    const printedRoute = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEITHER_SOURCE, as: "base" },
            { card: CHRONICLE_LV3, as: "ally" },
          ],
          hand: [{ card: CARD_ID, as: "grademon" }],
          deck: [{ card: NON_MATCH, as: "bonusDraw" }, "BT1-010"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    printedRoute.state.memory = 6;
    await printedRoute.ready();

    expect(
      printedRoute.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: printedRoute.perm("base").permanentId,
        instanceId: printedRoute.inst("grademon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => printedRoute.perm("base").topCard.cardId === CARD_ID);
    await settle(() => printedRoute.state.pendingDecision === undefined);
    expect(printedRoute.state.memory).toBe(2);
  });

  it("gives ＜Reboot＞ and ＜Blocker＞ to ONE chosen [Chronicle] Digimon on play, and nothing else", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "grademon" }],
          battleArea: [
            { card: CHRONICLE_LV3, as: "chronicle", dp: 9000 },
            { card: NON_MATCH, as: "plain", dp: 9000 },
          ],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-013"],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "theirs", dp: 9000 }], deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred, autoChooseOption: true },
    );
    preferred.push(s.perm("chronicle").topCard.instanceId);
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grademon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    await settle(() => observe(s.engine).hasKeyword(s.perm("chronicle"), "Reboot"));

    expect(observe(s.engine).hasKeyword(s.perm("chronicle"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("chronicle"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("theirs"), "Reboot")).toBe(false);
    expect(s.perm("chronicle").currentDP).toBe(9000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("chronicle"), "beAffected", "Digimon")).toBe(false);
    assertNoLoudGap(s);
  });

  it("reaches an [X Antibody] Digimon without [Chronicle] and never a plain one", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "grademon" }],
          battleArea: [{ card: X_ANTIBODY_LV3, as: "xOnly", dp: 9000 }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grademon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    await settle(() => observe(s.engine).hasKeyword(s.perm("xOnly"), "Reboot"));
    expect(observe(s.engine).hasKeyword(s.perm("xOnly"), "Blocker")).toBe(true);

    const noCandidate = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "grademon" }],
          battleArea: [{ card: NON_MATCH, as: "plain", dp: 9000 }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    noCandidate.state.memory = 8;
    await noCandidate.ready();
    expect(
      noCandidate.engine.applyIntent(0, { type: "playCard", instanceId: noCandidate.inst("grademon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => noCandidate.state.pendingDecision === undefined);
    expect(observe(noCandidate.engine).hasKeyword(noCandidate.perm("plain"), "Reboot")).toBe(false);
    const self = noCandidate.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === CARD_ID)!;
    expect(observe(noCandidate.engine).hasKeyword(self, "Reboot")).toBe(true);
  });

  it("Q7380-Q7386: gives the same target both keywords, immunity and +5000 DP during an attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "grademon", under: ["BT1-010"], dp: 7000 },
            { card: CHRONICLE_LV3, as: "chronicle", dp: 9000 },
          ],
          deck: [NON_MATCH, "BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "theirs", dp: 9000 }], deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chronicle").topCard.instanceId);
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("grademon"), {
      attackerPermanentId: s.perm("grademon").permanentId,
    });
    await settle(() => s.state.pendingDecision === undefined);

    expect(observe(s.engine).hasKeyword(s.perm("chronicle"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("chronicle"), "Blocker")).toBe(true);
    expect(s.perm("chronicle").currentDP).toBe(14_000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("chronicle"), "beAffected", "Digimon")).toBe(true);
    expect(s.perm("theirs").currentDP).toBe(9000);
    expect(observe(s.engine).hasKeyword(s.perm("theirs"), "Blocker")).toBe(false);
    assertNoLoudGap(s);
  });

  it("applies the rider when EX13-055 digivolves into it mid-attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: LV4_FEEDER, as: "raptor", under: ["BT1-010"], dp: 5000 },
            { card: CHRONICLE_LV3, as: "chronicle", dp: 9000 },
          ],
          hand: [{ card: CARD_ID, as: "grademon" }],
          deck: [{ card: NON_MATCH, as: "bonusDraw" }, "BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: {
          hand: [{ card: "BT20-033", as: "loader" }],
          battleArea: [{ card: NON_MATCH, as: "theirs", dp: 9000 }],
          deck: ["BT1-013"],
          security: ["BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chronicle").topCard.instanceId);
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("raptor").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(observe(s.engine).hasKeyword(s.perm("chronicle"), "Reboot")).toBe(true);
    expect(s.perm("chronicle").currentDP).toBe(14_000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("chronicle"), "beAffected", "Digimon")).toBe(true);

    preferred.push(s.perm("chronicle").topCard.instanceId);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("loader").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("chronicle").currentDP).toBe(14_000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("chronicle"), "beAffected", "Digimon")).toBe(true);
  });

  it("Q7383-Q7384: opposing Digimon DP effects stop at immunity and resume when it expires", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: LV4_FEEDER, as: "raptor", under: ["BT1-010"], dp: 5000 },
            { card: CHRONICLE_LV3, as: "chronicle", dp: 9000 },
          ],
          hand: [
            { card: CARD_ID, as: "grademon" },
            { card: "BT1-014", as: "spare" },
          ],
          deck: [NON_MATCH, "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-013", "BT1-011", "BT1-012", "BT1-014", "BT1-010"],
        },
        1: {
          hand: [
            { card: "BT20-033", as: "loaderBefore" },
            { card: "BT20-033", as: "loaderDuring" },
            { card: "BT1-014", as: "spare" },
          ],
          deck: ["BT1-013", "BT1-011", "BT1-012"],
          security: ["BT1-014", "BT1-010", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.perm("chronicle").topCard.instanceId);

    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("loaderBefore").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("chronicle").currentDP === 6000);
    expect(s.perm("chronicle").currentDP).toBe(6000);
    drive.endMainPhaseIfOpen(1);

    await drive.waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("raptor").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("chronicle"), "beAffected", "Digimon")).toBe(true);
    expect(s.perm("chronicle").currentDP).toBe(14_000);

    drive.endMainPhaseIfOpen(0);
    await drive.waitForMainPhase(1);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("loaderDuring").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("chronicle").currentDP).toBe(14_000);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("chronicle"), "beAffected", "Digimon")).toBe(true);

    drive.endMainPhaseIfOpen(1);
    await drive.waitForMainPhase(0);
    await settle(() => !observe(s.engine).isRestrictedByEffect(s.perm("chronicle"), "beAffected", "Digimon"));
    expect(s.perm("chronicle").currentDP).toBe(6000);
    if (!s.state.gameOver) s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    await loop;
  });

  it("Q7385: BT14-044 Palmon's gained suspension trigger doesn't fire while Grademon's immunity applies", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: LV4_FEEDER, as: "raptor", under: ["BT1-010"], dp: 5000 },
            { card: CHRONICLE_LV3, as: "chronicle", dp: 9000 },
          ],
          hand: [
            { card: CARD_ID, as: "grademon" },
            { card: "BT1-014", as: "spare" },
          ],
          deck: [NON_MATCH, "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-013", "BT1-011", "BT1-012", "BT1-014", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT14-044", as: "palmon" }],
          deck: ["BT1-013", "BT1-011"],
          security: ["BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.perm("chronicle").topCard.instanceId);

    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(1);
    await settle(() => s.state.pendingDecision === undefined);
    drive.endMainPhaseIfOpen(1);
    await drive.waitForMainPhase(0);
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("raptor").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("chronicle"), "beAffected", "Digimon")).toBe(true);
    expect(s.state.turnSeat).toBe(0);

    const beforeImmuneAttack = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("chronicle").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(beforeImmuneAttack);

    drive.endMainPhaseIfOpen(0);
    if (!s.state.gameOver) s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    await loop;

    const control = setupEngine(
      {
        0: {
          battleArea: [{ card: CHRONICLE_LV3, as: "chronicle", dp: 9000 }],
          hand: [{ card: "BT1-014", as: "spare" }],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-013", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT14-044", as: "palmon" }],
          deck: ["BT1-013", "BT1-011"],
          security: ["BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    control.state.turnSeat = 1;
    control.state.memory = 10;
    await control.ready();
    const controlLoop = control.engine.startTurnLoop();
    const controlDrive = advance(control.engine);
    await controlDrive.waitForMainPhase(1);
    await settle(() => control.state.pendingDecision === undefined);
    controlDrive.endMainPhaseIfOpen(1);
    await controlDrive.waitForMainPhase(0);
    control.state.memory = 2;
    const beforeControlAttack = control.state.memory;
    expect(
      control.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: control.perm("chronicle").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(control.engine).isAttacking());
    expect(control.state.memory).toBe(beforeControlAttack - 2);
    if (!control.state.gameOver) control.engine.applyIntent(control.state.turnSeat, { type: "surrender" });
    await controlLoop;
  });

  it("digivolves at end of attack into a [Chronicle] card in hand, once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "grademon", under: ["BT1-010"], dp: 7000 }],
          hand: [
            { card: CHRONICLE_LV6, as: "firstTarget" },
            { card: "BT20-018", as: "secondTarget" },
          ],
          deck: [{ card: NON_MATCH, as: "bonusDraw" }, "BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "theirs", dp: 9000 }], deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 9;
    await s.ready();
    const grademonId = s.perm("grademon").permanentId;

    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("grademon"));
    await settle(() => s.perm("grademon").stack.length === 2);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("grademon").permanentId).toBe(grademonId);
    expect(s.perm("grademon").stack.map(({ cardId }) => cardId)).toEqual(["BT1-010", CARD_ID]);
    const afterFirst = s.perm("grademon").topCard.cardId;
    expect([CHRONICLE_LV6, "BT20-018"]).toContain(afterFirst);

    const memoryAfterFirst = s.state.memory;
    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("grademon"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("grademon").topCard.cardId).toBe(afterFirst);
    expect(s.perm("grademon").stack).toHaveLength(2);
    expect(s.state.memory).toBe(memoryAfterFirst);
  });

  it("digivolves at end of attack into a [Chronicle] card in the TRASH", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "grademon", under: ["BT1-010"], dp: 7000 }],
          trash: [{ card: CHRONICLE_LV6, as: "target" }],
          hand: [{ card: "BT1-014", as: "spare" }],
          deck: [{ card: NON_MATCH, as: "bonusDraw" }, "BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 9;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("grademon"));
    await settle(() => s.perm("grademon").topCard.cardId === CHRONICLE_LV6);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("grademon").stack.map(({ cardId }) => cardId)).toEqual(["BT1-010", CARD_ID]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("target").instanceId);
  });

  it("refuses a non-[Chronicle] destination and leaves the quota untouched when declined", async () => {
    const noCandidate = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "grademon", under: ["BT1-010"], dp: 7000 }],
          hand: [{ card: "BT13-075", as: "nearMiss" }],
          deck: [NON_MATCH, "BT1-011"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    noCandidate.state.memory = 9;
    await noCandidate.ready();

    await advance(noCandidate.engine).fire(EffectTiming.OnEndAttack, noCandidate.perm("grademon"));
    await settle(() => noCandidate.state.pendingDecision === undefined);
    expect(noCandidate.perm("grademon").topCard.cardId).toBe(CARD_ID);
    expect(noCandidate.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      noCandidate.inst("nearMiss").instanceId,
    ]);
    expect(noCandidate.state.memory).toBe(9);

    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "grademon", under: ["BT1-010"], dp: 7000 }],
          hand: [{ card: CHRONICLE_LV6, as: "target" }],
          deck: [NON_MATCH, "BT1-011"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    declined.state.memory = 9;
    await declined.ready();
    await advance(declined.engine).fire(EffectTiming.OnEndAttack, declined.perm("grademon"));
    await settle(() => declined.state.pendingDecision === undefined);
    expect(declined.perm("grademon").topCard.cardId).toBe(CARD_ID);
    expect(declined.state.memory).toBe(9);
  });

  it("Q7388: saves a [Chronicle] ally from an effect deletion by trashing the top security card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: [{ card: CARD_ID, as: "source" }] },
            { card: CHRONICLE_LV3, as: "ally", dp: 9000 },
          ],
          security: [
            { card: "BT1-011", as: "cost" },
            { card: "BT1-012", as: "kept" },
          ],
          deck: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const allyId = s.perm("ally").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([allyId], "byEffect")).toBe(0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === allyId)).toBe(true);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("kept").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
  });

  it("saves a [Chronicle] ally that loses a real battle, not only effect deletions", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: [{ card: CARD_ID, as: "source" }] },
            { card: CHRONICLE_LV3, as: "ally", dp: 3000 },
          ],
          security: [
            { card: "BT1-011", as: "cost" },
            { card: "BT1-012", as: "kept" },
          ],
          deck: ["BT1-013", "BT1-010"],
        },
        1: {
          battleArea: [{ card: NON_MATCH, as: "wall", dp: 9000, suspended: true }],
          deck: ["BT1-013", "BT1-011"],
          security: ["BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();
    const allyId = s.perm("ally").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: allyId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === allyId)).toBe(true);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("kept").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
  });

  it("does not protect an [X Antibody] Digimon without the [Chronicle] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: [{ card: CARD_ID, as: "source" }] },
            { card: X_ANTIBODY_LV3, as: "xOnly", dp: 9000 },
          ],
          security: [{ card: "BT1-011", as: "untouched" }],
          deck: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("xOnly").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
  });

  it("lets the deletion resolve when declined, when security is empty, and after the per-turn use", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: [{ card: CARD_ID, as: "source" }] },
            { card: CHRONICLE_LV3, as: "ally", dp: 9000 },
          ],
          security: [{ card: "BT1-011", as: "untouched" }],
          deck: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await declined.ready();
    expect(await advance(declined.engine).verb.deletePermanent([declined.perm("ally").permanentId], "byEffect")).toBe(
      1,
    );
    expect(declined.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      declined.inst("untouched").instanceId,
    ]);

    const noSecurity = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: [{ card: CARD_ID, as: "source" }] },
            { card: CHRONICLE_LV3, as: "ally", dp: 9000 },
          ],
          deck: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await noSecurity.ready();
    expect(
      await advance(noSecurity.engine).verb.deletePermanent([noSecurity.perm("ally").permanentId], "byEffect"),
    ).toBe(1);

    const twice = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: [{ card: CARD_ID, as: "source" }] },
            { card: CHRONICLE_LV3, as: "first", dp: 9000 },
            { card: CHRONICLE_LV3, as: "second", dp: 9000 },
          ],
          security: [
            { card: "BT1-011", as: "cost" },
            { card: "BT1-012", as: "kept" },
          ],
          deck: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await twice.ready();
    expect(await advance(twice.engine).verb.deletePermanent([twice.perm("first").permanentId], "byEffect")).toBe(0);
    await settle(() => twice.state.pendingDecision === undefined);
    expect(await advance(twice.engine).verb.deletePermanent([twice.perm("second").permanentId], "byEffect")).toBe(1);
    expect(twice.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      twice.inst("kept").instanceId,
    ]);
  });

  it("grants the inherited clause only from inside a stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: ["BT1-012"] },
            { card: CHRONICLE_LV3, as: "ally", dp: 9000 },
          ],
          security: [{ card: "BT1-011", as: "untouched" }],
          deck: ["BT1-013"],
        },
        1: { deck: ["BT1-013"], security: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("ally").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
  });

  it("carries both keywords into the opponent's turn, reboots, blocks, and expires at that turn's end", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "grademon" }],
          battleArea: [{ card: CHRONICLE_LV3, as: "chronicle", dp: 12_000 }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-013", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT9-035", as: "attacker", dp: 6000 }],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: ["BT1-013", "BT1-011", "BT1-012"],
          security: ["BT1-014"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chronicle").topCard.instanceId);
    s.state.turnSeat = 0;
    s.state.memory = 8;
    await s.ready();

    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grademon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    await settle(() => observe(s.engine).hasKeyword(s.perm("chronicle"), "Reboot"));

    s.perm("chronicle").isSuspended = true;
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("chronicle").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("chronicle"), "Blocker")).toBe(true);

    const securityBefore = s.state.players[0]!.security.length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("chronicle").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(securityBefore);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);

    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    expect(observe(s.engine).hasKeyword(s.perm("chronicle"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("chronicle"), "Blocker")).toBe(false);
  });

  it("blanks an opponent Digimon's effect during the attack rider while an opponent Option still lands", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: LV4_FEEDER, as: "raptor", under: ["BT1-010"], dp: 5000 },
            { card: CHRONICLE_LV3, as: "chronicle", dp: 9000 },
          ],
          hand: [{ card: CARD_ID, as: "grademon" }],
          deck: [{ card: NON_MATCH, as: "bonusDraw" }, "BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: {
          hand: [
            { card: "BT20-033", as: "digimonEffect" },
            { card: "BT1-106", as: "optionEffect" },
          ],
          deck: ["BT1-013", "BT1-011", "BT1-012"],
          security: ["BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chronicle").topCard.instanceId);
    s.state.turnSeat = 0;
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("raptor").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("chronicle").currentDP).toBe(14_000);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("digimonEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("chronicle").currentDP).toBe(14_000);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("optionEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("chronicle").currentDP).toBe(7000);
  });

  it("leaves the recipient exposed to an opponent Digimon effect when the grant happened OUTSIDE an attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "grademon" }],
          battleArea: [{ card: CHRONICLE_LV3, as: "chronicle", dp: 9000 }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-013"],
        },
        1: {
          hand: [{ card: "BT20-033", as: "digimonEffect" }],
          deck: ["BT1-013", "BT1-011", "BT1-012"],
          security: ["BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chronicle").topCard.instanceId);
    s.state.turnSeat = 0;
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grademon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    await settle(() => observe(s.engine).hasKeyword(s.perm("chronicle"), "Reboot"));
    expect(s.perm("chronicle").currentDP).toBe(9000);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("digimonEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("chronicle").currentDP).toBe(6000);
  });

  it("Q7387: End of Attack evolution still satisfies Alphamon's during-an-attack condition", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          breeding: { card: CARD_ID, as: "breedingGrademon" },
          battleArea: [
            { card: CARD_ID, as: "grademon", under: ["BT1-010"], dp: 7000 },
            { card: CHRONICLE_LV3, as: "other", dp: 9000 },
          ],
          hand: [
            { card: CHRONICLE_LV6, as: "firstTarget" },
            { card: "BT20-018", as: "secondTarget" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-013", "BT1-011"], security: ["BT1-014", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 0;
    s.state.memory = 12;
    await s.ready();
    preferred.push(s.inst("firstTarget").instanceId, s.inst("secondTarget").instanceId);
    const grademonId = s.perm("grademon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: grademonId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    await settle(() => !observe(s.engine).isAttacking());

    const host = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === grademonId)!;
    const afterFirst = host.topCard.cardId;
    expect(afterFirst).toBe(CHRONICLE_LV6);
    expect(host.stack.map(({ cardId }) => cardId)).toEqual(["BT1-010", CARD_ID]);
    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("BT20-018");

    const handBefore = s.state.players[0]!.hand.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    const reread = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === grademonId)!;
    expect(reread.topCard.cardId).toBe(afterFirst);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
  });
});
