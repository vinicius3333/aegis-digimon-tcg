import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
import { compiled } from "./EX13-049.js";

const CARD_ID = "EX13-049";

const NAME_ONLY_EGG = "BT25-006";
const TRAIT_ONLY_EGG = "BT8-005";
const NEITHER_EGG = "BT10-005";
const X_ANTIBODY = "BT13-063";
const CHRONICLE_TAMER = "BT20-087";
const NON_MATCH = "BT1-009";
const TEXT_ONLY_NEAR_MATCH = "BT9-095";

async function attackWindow(s: ReturnType<typeof setupEngine>, alias: string): Promise<void> {
  await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm(alias), {
    attackerPermanentId: s.perm(alias).permanentId,
  });
}

describe("EX13-049 Dorumon", () => {
  it("matches the catalog printed text, stats and evolution costs", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Dorumon",
      colors: ["Black", "Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Beast", "X Antibody", "Chronicle"],
      evoCosts: [
        { color: "Black", level: 2, memoryCost: 1 },
        { color: "Yellow", level: 2, memoryCost: 1 },
      ],
      effectText:
        "[Digivolve] [Dorimon]/Black Lv.2 w/[X Antibody] trait: Cost 0 \n\n[When Moving] [On Play] Reveal the top 3 cards of your deck. Add 1 card with the [X Antibody] or [Chronicle] trait among them to the hand. Return the rest to the top or bottom of the deck.",
      inheritedEffectText: "[When Attacking] [Once Per Turn] 1 of your opponent's Digimon gets -2000 DP for the turn.",
    });
  });

  it("compiles every printed clause", () => {
    expect(runtimeCompiledCard(CARD_ID)).toMatchObject({ coverage: "full", residual: [] });

    expect(digivolutionRequirementsFor(CARD_ID)).toEqual([
      { namesExact: ["Dorimon"], cost: 0, isAlternate: true },
      { level: 2, colors: ["Black"], traits: ["X Antibody"], cost: 0, isAlternate: true },
    ]);
    expect(compiled.assemblyRequirement).toBeUndefined();

    const traitUnion = {
      controllerDefault: "mine",
      nameOrTrait: [{ tokens: ["X Antibody", "Chronicle"], match: "trait" }],
    };

    for (const trigger of ["WhenMoving", "OnPlay"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.isInherited).toBeUndefined();
      expect(effect.frequency).toBeUndefined();
      expect(effect.actions).toMatchObject([
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [{ filter: traitUnion, count: 1, to: "hand" }],
          rest: "deckTopOrBottom",
        },
      ]);
    }

    const inherited = compiled.effects.find((effect) => effect.isInherited)!;
    expect(inherited).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"], zone: "battleArea" }, count: 1 },
          amount: -2000,
          duration: "forTheTurn",
        },
      ],
    });
  });

  it("takes the [Dorimon] half for 0 from a purple Dorimon the colour half cannot reach", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: NAME_ONLY_EGG, as: "egg" },
        hand: [{ card: CARD_ID, as: "dorumon" }],
        deck: [{ card: NON_MATCH, as: "bonusDraw" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("dorumon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === CARD_ID);

    expect(s.state.memory).toBe(0);
    expect(s.perm("egg").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("egg").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusDraw").instanceId]);

    const wrongHalf = setupEngine({
      0: {
        breeding: { card: NAME_ONLY_EGG, as: "egg" },
        hand: [{ card: CARD_ID, as: "dorumon" }],
        deck: [NON_MATCH],
      },
    });
    wrongHalf.state.memory = 0;
    await wrongHalf.ready();

    expect(
      wrongHalf.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongHalf.perm("egg").permanentId,
        instanceId: wrongHalf.inst("dorumon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(wrongHalf.perm("egg").topCard.cardId).toBe(NAME_ONLY_EGG);
    expect(wrongHalf.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      wrongHalf.inst("dorumon").instanceId,
    ]);
    expect(wrongHalf.state.memory).toBe(0);
  });

  it("takes the Black Lv.2 [X Antibody] half for 0 from a Kyokyomon the name half cannot reach", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: TRAIT_ONLY_EGG, as: "egg" },
        hand: [{ card: CARD_ID, as: "dorumon" }],
        deck: [{ card: NON_MATCH, as: "bonusDraw" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("dorumon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === CARD_ID);
    expect(s.state.memory).toBe(0);
    expect(s.perm("egg").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("egg").instanceId]);

    const wrongHalf = setupEngine({
      0: {
        breeding: { card: TRAIT_ONLY_EGG, as: "egg" },
        hand: [{ card: CARD_ID, as: "dorumon" }],
        deck: [NON_MATCH],
      },
    });
    wrongHalf.state.memory = 0;
    await wrongHalf.ready();

    expect(
      wrongHalf.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongHalf.perm("egg").permanentId,
        instanceId: wrongHalf.inst("dorumon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(wrongHalf.perm("egg").topCard.cardId).toBe(TRAIT_ONLY_EGG);
    expect(wrongHalf.state.memory).toBe(0);
  });

  it("refuses both header halves for a Black Lv.2 without [X Antibody] and charges the printed 1", async () => {
    for (const alternateRequirementIndex of [0, 1]) {
      const s = setupEngine({
        0: {
          breeding: { card: NEITHER_EGG, as: "egg" },
          hand: [{ card: CARD_ID, as: "dorumon" }],
          deck: [NON_MATCH],
        },
      });
      s.state.memory = 0;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("egg").permanentId,
          instanceId: s.inst("dorumon").instanceId,
          useAlternateCost: true,
          alternateRequirementIndex,
        }),
      ).toEqual(expect.objectContaining({ ok: false }));
      expect(s.perm("egg").topCard.cardId).toBe(NEITHER_EGG);
      expect(s.state.memory).toBe(0);
    }

    const printedRoute = setupEngine({
      0: {
        breeding: { card: NEITHER_EGG, as: "egg" },
        hand: [{ card: CARD_ID, as: "dorumon" }],
        deck: [{ card: NON_MATCH, as: "bonusDraw" }],
      },
    });
    printedRoute.state.memory = 0;
    await printedRoute.ready();

    expect(
      printedRoute.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: printedRoute.perm("egg").permanentId,
        instanceId: printedRoute.inst("dorumon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => printedRoute.perm("egg").topCard.cardId === CARD_ID);
    expect(printedRoute.state.memory).toBe(-1);
  });

  it("adds one [X Antibody] card to hand and sends the rest to the BOTTOM when that branch is chosen", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "dorumon" }],
          deck: [
            { card: X_ANTIBODY, as: "toHand" },
            { card: NON_MATCH, as: "restA" },
            { card: "BT1-010", as: "restB" },
            { card: "BT1-012", as: "sentinel" },
          ],
          security: ["BT1-013"],
        },
        1: { security: ["BT1-014"], deck: ["BT1-013"] },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred, preferOptionIndex: 1 },
    );
    preferred.push(s.inst("toHand").instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dorumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("toHand").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("sentinel").instanceId,
      s.inst("restA").instanceId,
      s.inst("restB").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("adds a [Chronicle] TAMER — the printed subject is '1 card' — and returns the rest to the TOP", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "dorumon" }],
          deck: [
            { card: CHRONICLE_TAMER, as: "toHand" },
            { card: NON_MATCH, as: "restA" },
            { card: "BT1-010", as: "restB" },
            { card: "BT1-012", as: "sentinel" },
          ],
          security: ["BT1-013"],
        },
        1: { security: ["BT1-014"], deck: ["BT1-013"] },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred, preferOptionIndex: 0 },
    );
    preferred.push(s.inst("toHand").instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dorumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("toHand").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("restA").instanceId,
      s.inst("restB").instanceId,
      s.inst("sentinel").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("adds nothing when no revealed card carries either trait", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "dorumon" }],
          deck: [
            { card: NON_MATCH, as: "restA" },
            { card: "BT1-010", as: "restB" },
            { card: "BT1-011", as: "restC" },
            { card: "BT1-012", as: "sentinel" },
          ],
          security: ["BT1-013"],
        },
        1: { security: ["BT1-014"], deck: ["BT1-013"] },
      },
      { autoSelectCards: true, autoOrderCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dorumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("sentinel").instanceId,
      s.inst("restA").instanceId,
      s.inst("restB").instanceId,
      s.inst("restC").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("refuses a near-match that only prints [X Antibody] in its text and carries no such trait", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "dorumon" }],
          deck: [
            { card: TEXT_ONLY_NEAR_MATCH, as: "nearMatch" },
            { card: "BT1-010", as: "restB" },
            { card: "BT1-011", as: "restC" },
            { card: "BT1-012", as: "sentinel" },
          ],
          security: ["BT1-013"],
        },
        1: { security: ["BT1-014"], deck: ["BT1-013"] },
      },
      { autoSelectCards: true, autoOrderCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dorumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("sentinel").instanceId,
      s.inst("nearMatch").instanceId,
      s.inst("restB").instanceId,
      s.inst("restC").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it("fires the same reveal clause when it moves out of breeding", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          breeding: { card: CARD_ID, as: "dorumon" },
          hand: [{ card: "BT1-014", as: "spare" }],
          deck: [
            { card: X_ANTIBODY, as: "toHand" },
            { card: NON_MATCH, as: "restA" },
            { card: "BT1-010", as: "restB" },
            { card: "BT1-012", as: "sentinel" },
          ],
          security: ["BT1-013"],
        },
        1: { security: ["BT1-014"], deck: ["BT1-013"] },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred, preferOptionIndex: 1 },
    );
    preferred.push(s.inst("toHand").instanceId);
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Breeding" && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("dorumon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === X_ANTIBODY));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("spare").instanceId, s.inst("toHand").instanceId]),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("sentinel").instanceId,
      s.inst("restA").instanceId,
      s.inst("restB").instanceId,
    ]);
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("drops exactly one opposing Digimon by 2000 DP on the public attack route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "host", under: [{ card: CARD_ID, as: "dorumon" }], dp: 20_000 }],
          deck: ["BT1-012", "BT1-013"],
          security: ["BT1-013"],
        },
        1: {
          battleArea: [
            { card: NON_MATCH, as: "first", dp: 9000 },
            { card: "BT1-012", as: "second", dp: 9000 },
          ],
          security: [{ card: "BT1-014", as: "opponentSecurity" }],
          deck: ["BT1-013"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: [] },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    await settle(() => [s.perm("first"), s.perm("second")].some(({ currentDP }) => currentDP === 7000));

    const dps = [s.perm("first").currentDP, s.perm("second").currentDP].sort((a, b) => a - b);
    expect(dps).toEqual([7000, 9000]);
    expect(s.perm("host").currentDP).toBe(20_000);
    expect(s.perm("host").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("refuses a second -2000 in the same turn and reopens on the controller's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "host", under: [{ card: CARD_ID, as: "dorumon" }], dp: 20_000 }],
          deck: ["BT1-009", "BT1-012", "BT1-013"],
          security: ["BT1-013"],
        },
        1: {
          battleArea: [
            { card: NON_MATCH, as: "first", dp: 9000 },
            { card: "BT1-012", as: "second", dp: 9000 },
          ],
          deck: ["BT1-009", "BT1-012", "BT1-013"],
          security: ["BT1-014"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await attackWindow(s, "host");
    await settle(() => s.state.pendingDecision === undefined);
    const hit = ["first", "second"].filter((alias) => s.perm(alias).currentDP === 7000);
    expect(hit).toHaveLength(1);
    const other = ["first", "second"].find((alias) => alias !== hit[0])!;

    await attackWindow(s, "host");
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm(other).currentDP).toBe(9000);
    expect(s.perm(hit[0]!).currentDP).toBe(7000);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm(hit[0]!).currentDP).toBe(9000);

    s.state.turnSeat = 0;
    await attackWindow(s, "host");
    await settle(() => s.state.pendingDecision === undefined);
    expect(["first", "second"].filter((alias) => s.perm(alias).currentDP === 7000)).toHaveLength(1);
  });

  it("grants the inherited clause only from inside a stack", async () => {
    const withoutDorumon = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-014", as: "host", under: ["BT1-012"], dp: 20_000 }] },
        1: { battleArea: [{ card: NON_MATCH, as: "victim", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    await withoutDorumon.ready();
    await attackWindow(withoutDorumon, "host");
    await settle(() => withoutDorumon.state.pendingDecision === undefined);
    expect(withoutDorumon.perm("victim").currentDP).toBe(9000);

    const peerAttacks = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: [{ card: CARD_ID, as: "dorumon" }], dp: 20_000 },
            { card: "BT1-012", as: "peer", dp: 20_000 },
          ],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "victim", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    await peerAttacks.ready();
    await attackWindow(peerAttacks, "peer");
    await settle(() => peerAttacks.state.pendingDecision === undefined);
    expect(peerAttacks.perm("victim").currentDP).toBe(9000);
  });
});
