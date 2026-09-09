import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-036.js";

// Fixtures, all inert unless the test needs their printed text:
//   BT18-036 Wizardmon        Lv4 Yellow  — exact [Wizardmon] name, the alternate route's base
//   BT12-078 Wizardmon (X Antibody) Lv4 Purple — name-substring near miss for [Wizardmon]
//   BT12-073 Impmon (X Antibody)    Lv3 Purple — [X Antibody] trait without the [Wizardmon] name
//   BT1-045  Tsukaimon       Lv3 Yellow  — neither name nor trait
//   BT1-102  Blade of the True   Yellow Option cost 2  — eligible
//   BT10-107 Buzzing Fist       Purple Option cost 2  — eligible
//   BT1-107  Holy Wave          Yellow Option cost 6  — cost near miss
//   BT1-108  Horn Buster        Green  Option cost 1  — colour near miss
//   BT14-100 Pummel Whack       Purple Option cost 3  — "delete 1 opponent Lv4 or lower Digimon"
const SPARE = "BT1-013";
const DECK = ["BT1-009", "BT1-010", "BT1-012", "BT1-013", "BT1-014", "BT1-009"];

describe("BT19-036 Wizardmon (X Antibody)", () => {
  it("matches the catalog printed identity and text", () => {
    expect(getCardDefinition("BT19-036")).toMatchObject({
      cardId: "BT19-036",
      nameEn: "Wizardmon (X Antibody)",
      colors: ["Yellow", "Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 6000,
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Wizard", "X Antibody", "Witchelny"],
      evoCosts: [
        { color: "Yellow", level: 3, memoryCost: 3 },
        { color: "Purple", level: 3, memoryCost: 3 },
      ],
      effectText:
        "[Digivolve][Wizardmon]: Cost 0 \n\n[On Play] [When Digivolving] Add your top security card to the hand. Then, if [Wizardmon]/[X Antibody] is in this Digimon's digivolution cards, you may place 1 yellow or purple Option card with cost of 5 or less from your hand as your bottom security card.",
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When this yellow Digimon with the [Data]/[Witchelny]\u00A0trait would leave the battle area by your opponent's effects, by trashing your top security card, it doesn't leave.",
    });
  });

  it("compiles every printed clause", () => {
    // "[Wizardmon]" is bracketed, so it is an EXACT name gate; "[X Antibody]" is a trait.
    for (const index of [0, 1] as const) {
      expect(compiled.effects?.[index]).toMatchObject({
        trigger: index === 0 ? "OnPlay" : "WhenDigivolving",
        actions: [
          { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: true },
          {
            kind: "SecurityManipulation",
            op: "addBottom",
            optional: true,
            source: {
              filter: {
                zone: "hand",
                controller: "mine",
                kind: ["Option"],
                playCostLte: 5,
                colors: ["Yellow", "Purple"],
              },
              count: 1,
              upTo: true,
            },
            condition: {
              kind: "selfHasInDigivolutionCards",
              nameOrTrait: [
                { tokens: ["Wizardmon"], match: "nameExact" },
                { tokens: ["X Antibody"], match: "trait" },
              ],
            },
          },
        ],
      });
    }
    // Printed "[All Turns] [Once Per Turn]" and "when THIS ... Digimon would leave".
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "opponentEffect",
          sourceFilter: {
            isSelfRef: true,
            controllerDefault: "mine",
            kind: ["Digimon"],
            colors: ["Yellow"],
            nameOrTrait: [
              { tokens: ["Data"], match: "trait" },
              { tokens: ["Witchelny"], match: "trait", orPrevious: true },
            ],
          },
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
          },
        },
      ],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Wizardmon"], cost: 0, isAlternate: true }]);
  });

  // ---------------------------------------------------------------------------
  // [Digivolve][Wizardmon]: Cost 0
  // ---------------------------------------------------------------------------

  it("digivolves from an exact [Wizardmon] for 0 memory and draws the digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-036", as: "base" }],
          hand: [{ card: "BT19-036", as: "wizardX" }, SPARE],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-009"], deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wizardX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-036");
    await drainMicrotasks(40);

    // The alternate route is free: the Lv3 evoCost (3) was never charged.
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evoDraw").instanceId);
  });

  it("refuses the [Wizardmon] route for the name-substring peer Wizardmon (X Antibody)", async () => {
    // BT12-078 is NAMED "Wizardmon (X Antibody)": a substring gate would accept it, the printed
    // bracketed [Wizardmon] does not. It is Lv4, so no normal Lv3 evoCost route exists either.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-078", as: "base" }],
          hand: [{ card: "BT19-036", as: "wizardX" }, SPARE],
          deck: DECK,
          security: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-009"], deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("wizardX").instanceId,
      useAlternateCost: true,
    });
    await drainMicrotasks(20);

    expect(result.ok).toBe(false);
    expect(s.perm("base").topCard?.cardId).toBe("BT12-078");
    expect(s.state.memory).toBe(10);
  });

  it("refuses an illegal source that is neither [Wizardmon] nor a legal Lv3 base", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "base" }],
          hand: [{ card: "BT19-036", as: "wizardX" }, SPARE],
          deck: DECK,
          security: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-009"], deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("wizardX").instanceId,
    });
    await drainMicrotasks(20);

    expect(result.ok).toBe(false);
    expect(s.perm("base").topCard?.cardId).toBe("BT1-014");
    expect(s.state.memory).toBe(10);
  });

  it("still charges the printed Lv3 evoCost on the normal route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-045", as: "base" }],
          hand: [{ card: "BT19-036", as: "wizardX" }, SPARE],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-009"], deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wizardX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-036");
    await drainMicrotasks(40);

    expect(s.state.memory).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // [On Play] [When Digivolving] Add your top security card to the hand. Then, ...
  // ---------------------------------------------------------------------------

  it("adds the top security card to the hand on a public play, with no stack to satisfy the gate", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-036", as: "wizardX" }, { card: "BT1-102", as: "option" }, SPARE],
          deck: DECK,
          security: [
            { card: "BT1-009", as: "top" },
            { card: "BT1-010", as: "second" },
          ],
        },
        1: { security: ["BT1-009"], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wizardX").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 1);
    await drainMicrotasks(40);

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("second").instanceId]);
    // Played from hand: no digivolution cards, so the conditional placement never runs and the
    // eligible Option stays in hand.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual(
      [
        s.inst("top").instanceId,
        s.inst("option").instanceId,
        s.state.players[0]!.hand.find((c) => c.cardId === SPARE)!.instanceId,
      ].sort(),
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    ["BT18-036", "an exact [Wizardmon] base", "BT1-102"],
    ["BT12-073", "an [X Antibody] trait base", "BT10-107"],
  ])(
    "places the chosen Option at the BOTTOM of security when digivolving from %s (%s)",
    async (baseCard, _label, optionCard) => {
      const alternate = baseCard === "BT18-036";
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: baseCard, as: "base" }],
            hand: [{ card: "BT19-036", as: "wizardX" }, { card: optionCard, as: "option" }, SPARE],
            deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
            security: [
              { card: "BT1-009", as: "top" },
              { card: "BT1-010", as: "second" },
            ],
          },
          1: { security: ["BT1-009"], deck: DECK },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 5;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("wizardX").instanceId,
          ...(alternate ? { useAlternateCost: true } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.security.length === 2 && s.perm("base").topCard?.cardId === "BT19-036");
      await drainMicrotasks(40);

      // Top security card left for the hand; the Option went UNDER the remaining security card.
      expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
        s.inst("second").instanceId,
        s.inst("option").instanceId,
      ]);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("top").instanceId);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("does not offer the placement when neither [Wizardmon] nor [X Antibody] is in the digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-045", as: "base" }],
          hand: [{ card: "BT19-036", as: "wizardX" }, { card: "BT1-102", as: "option" }, SPARE],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: [
            { card: "BT1-009", as: "top" },
            { card: "BT1-010", as: "second" },
          ],
        },
        1: { security: ["BT1-009"], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wizardX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-036");
    await drainMicrotasks(40);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("second").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
  });

  it("places the Option even when there is no security card to add to the hand (Q3093)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-036", as: "base" }],
          hand: [{ card: "BT19-036", as: "wizardX" }, { card: "BT1-102", as: "option" }, SPARE],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: [],
        },
        1: { security: ["BT1-009"], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wizardX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    await drainMicrotasks(40);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("option").instanceId]);
  });

  it.each([
    ["BT1-102", "a yellow Option with cost 2"],
    ["BT10-107", "a purple Option with cost 2"],
  ])("only %s is eligible among near-miss hand cards (%s) (Q3091)", async (optionCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-036", as: "base" }],
          hand: [
            { card: "BT19-036", as: "wizardX" },
            { card: optionCard, as: "option" },
            { card: "BT1-107", as: "tooExpensive" },
            { card: "BT1-108", as: "wrongColor" },
            { card: "BT1-045", as: "notAnOption" },
          ],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: [{ card: "BT1-009", as: "top" }],
        },
        1: { security: ["BT1-009"], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wizardX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    await drainMicrotasks(40);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("option").instanceId]);
    for (const alias of ["tooExpensive", "wrongColor", "notAnOption"]) {
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst(alias).instanceId);
    }
  });

  it("leaves the Option in hand when the optional placement is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-036", as: "base" }],
          hand: [{ card: "BT19-036", as: "wizardX" }, { card: "BT1-102", as: "option" }, SPARE],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: [
            { card: "BT1-009", as: "top" },
            { card: "BT1-010", as: "second" },
          ],
        },
        1: { security: ["BT1-009"], deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wizardX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    await drainMicrotasks(40);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("second").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
  });

  // ---------------------------------------------------------------------------
  // Inherited [All Turns] [Once Per Turn] would-leave prevention
  // ---------------------------------------------------------------------------

  /**
   * The opponent's deletion is a real Option play (BT14-100 "[Main] Delete 1 of your opponent's
   * level 4 or lower Digimon") resolved inside their own Main phase, driven by the turn loop.
   */
  async function opponentDeletes(
    hostCard: string,
    peerCard: string | undefined,
    targetAlias: string,
    copies: number,
  ): Promise<ReturnType<typeof setupEngine>> {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: hostCard, as: "host", under: ["BT19-036"] },
            ...(peerCard === undefined ? [] : [{ card: peerCard, as: "peer" }]),
          ],
          hand: [SPARE],
          deck: DECK,
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-010", as: "sec2" },
          ],
        },
        1: {
          // BT14-100 is a purple Option: its controller needs a purple card in play to meet the
          // colour requirement (CR 8-5-1). BT3-076 Candlemon is inert.
          battleArea: [{ card: "BT3-076", as: "purpleSource" }],
          hand: Array.from({ length: copies }, (_, index) => ({ card: "BT14-100", as: `whack${index}` })),
          deck: DECK,
          security: ["BT1-009", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm(targetAlias).permanentId, s.perm(targetAlias).topCard!.instanceId);
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    for (let index = 0; index < copies; index += 1) {
      s.state.memory = 6;
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst(`whack${index}`).instanceId })).toEqual({
        ok: true,
      });
      await drainMicrotasks(120);
    }
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    return s;
  }

  it("keeps a yellow [Data] host on the board by trashing the top security card", async () => {
    const s = await opponentDeletes("BT10-033", undefined, "host", 1);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT10-033"]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("sec2").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("sec1").instanceId);
  });

  it("does not protect the controller's OTHER yellow [Data] Digimon", async () => {
    // "When THIS ... Digimon would leave" (Q3092): only the permanent carrying BT19-036 in its
    // digivolution cards is guarded. BT3-037 is a yellow [Data] Digimon without it.
    const s = await opponentDeletes("BT10-033", "BT3-037", "peer", 1);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT10-033"]);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT3-037");
  });

  it("does not protect a yellow host without the [Data] or [Witchelny] trait", async () => {
    // BT1-051 Reppamon is yellow with [Holy Beast]/Vaccine — neither printed trait.
    const s = await opponentDeletes("BT1-051", undefined, "host", 1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(2);
  });

  it("prevents only once per turn", async () => {
    const s = await opponentDeletes("BT10-033", undefined, "host", 2);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    // Exactly one security card paid for the single use.
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("sec2").instanceId]);
  });

  it("does not prevent a battle deletion (opponent's effects only)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-033", as: "host", dp: 20_000, under: ["BT19-036"] }],
          hand: [SPARE],
          deck: DECK,
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-010", as: "sec2" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "attacker", dp: 25_000 }],
          hand: [SPARE],
          deck: DECK,
          security: ["BT1-009", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();

    // The host must be suspended to be attackable, so it attacks on its own turn first.
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended && !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
