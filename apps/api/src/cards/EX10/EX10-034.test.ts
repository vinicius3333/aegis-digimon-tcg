import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import compiled from "./EX10-034.js";
import "../index.js";

const CARD_ID = "EX10-034";

describe("EX10-034 Blastmon compiled contract", () => {
  it("records the exact catalog and evolution routes", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Black", "Purple"],
      level: 6,
      playCost: 13,
      dp: 13000,
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 5 },
        { color: "Purple", level: 5, memoryCost: 5 },
      ],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Mineral", "Bagra Army"],
    });
    // The printed rows are ordinary EvoCost routes, not bracketed [Digivolve] alternates.
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, colors: ["Black"], cost: 5, isAlternate: false },
      { level: 5, colors: ["Purple"], cost: 5, isAlternate: false },
    ]);
  });

  it("preserves keywords, gained attack, exact two-card cost, and DigiXros", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          keywords: expect.arrayContaining([
            expect.objectContaining({ keyword: "Collision" }),
            expect.objectContaining({ keyword: "Fragment", amount: 3 }),
            expect.objectContaining({ keyword: "Blocker" }),
          ]),
        }),
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [
            expect.objectContaining({
              kind: "GainTriggeredEffect",
              gainedTrigger: "StartOfYourMainPhase",
              // A subject-less Attack is a no-op: runCombatAction returns before doing anything.
              gainedActions: [
                expect.objectContaining({ kind: "Attack", target: expect.objectContaining({ isSelf: true }) }),
              ],
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: [
            expect.objectContaining({
              kind: "GainTriggeredEffect",
              gainedTrigger: "StartOfYourMainPhase",
              gainedActions: [
                expect.objectContaining({ kind: "Attack", target: expect.objectContaining({ isSelf: true }) }),
              ],
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "AllTurns",
          frequency: "OncePerTurn",
          actions: [
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenAttacking",
              actions: expect.arrayContaining([
                expect.objectContaining({
                  kind: "GainKeyword",
                  keyword: expect.objectContaining({ keyword: "SecurityAttack", amount: 1 }),
                  // "until YOUR turn ends" on an [All Turns] watcher: an unknown duration string
                  // falls through toDuration's default (UntilEachTurnEnd) and would expire at the
                  // end of the opponent's turn the buff was taken on.
                  duration: "untilYourTurnEnd",
                  optional: true,
                  abortOnDecline: true,
                  cost: expect.objectContaining({
                    kind: "trash",
                    target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 2 },
                  }),
                }),
              ]),
            }),
          ],
        }),
      ]),
    );
    // `count` is the PER-MATERIAL discount; `maxMaterials` is the printed "2 Digimon cards".
    // Without the cap a single-slot recipe accepts every matching candidate at -2 each.
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ traits: ["Bagra Army"] }], count: 2, maxMaterials: 2 },
    ]);
  });

  it("Q5101 grants the selected opposing Digimon a start-main forced-attack subscription", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "blast" }], security: ["BT1-009"] },
        // A vanilla Digimon: the granted attack must not be entangled with the fixture's own
        // [When Attacking] prompts (the skill's neutral-fixture rule).
        1: { battleArea: [{ card: "BT1-019", as: "target" }] },
      },
      // Blastmon has <Blocker>: the forced attack offers it the block, and an unanswered
      // optional stalls the resolution. Declining keeps the attack on the security stack.
      { autoSelectCards: true, autoChooseOption: true, autoDeclineOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("blast"));
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("target").permanentId)).toHaveLength(1);
    // The subscription alone proves nothing: a gained Attack with no subject resolves to a no-op.
    // On the granted Digimon's own main phase it must actually declare the attack.
    s.state.turnSeat = 1;
    // The declaration is the whole proof and it is where the defect lived: a subject-less Attack
    // returns from `runCombatAction` before `forceAttack`, so nothing suspends and no attack-target
    // decision is ever raised. The battle itself is deliberately left open — this attack is forced
    // outside a real turn flow, and the resolution never settles under the harness, so awaiting it
    // would only test the harness.
    const attack = advance(s.engine)
      .fireArmedSubTriggers("startOfYourMainPhase", {})
      .catch(() => undefined);
    await settle(() => s.perm("target").isSuspended === true);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isAttacking()).toBe(true);
    expect(
      s.decisions.some(
        ({ req }) => req.kind === "selectCards" && req.options?.candidateInstanceIds?.includes("player"),
      ),
    ).toBe(true);
    void attack;
  });

  it("Q5102/Q5103 pays exactly 2 of Blastmon's sources on either player's attack and buffs itself once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "blast",
              under: [
                { card: "EX10-025", as: "first" },
                { card: "EX10-028", as: "second" },
                { card: "EX10-003", as: "third" },
              ],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    const baseDp = s.perm("blast").currentDP;
    const attackerId = s.perm("attacker").permanentId;
    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: attackerId });
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.perm("blast").currentDP).toBe(baseDp + 3000);
    expect(observe(s.engine).keywordAmount(s.perm("blast"), "SecurityAttack")).toBe(1);
    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: attackerId });
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("CR 15-7-4 lets the controller decline the two-card processing condition", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "blast",
              under: [
                { card: "EX10-025", as: "first" },
                { card: "EX10-028", as: "second" },
              ],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    const baseDp = s.perm("blast").currentDP;
    await advance(s.engine).fireSubTrigger("whenAttacking", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("blast").currentDP).toBe(baseDp);
    expect(observe(s.engine).keywordAmount(s.perm("blast"), "SecurityAttack")).toBe(0);
  });

  it('keeps the "until your turn ends" buff past the opponent turn it was taken on', async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "blast",
              under: [
                { card: "EX10-025", as: "first" },
                { card: "EX10-028", as: "second" },
              ],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const baseDp = s.perm("blast").currentDP;
    await advance(s.engine).fireSubTrigger("whenAttacking", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    expect(s.perm("blast").currentDP).toBe(baseDp + 3000);
    // End of the OPPONENT's turn: an UntilEachTurnEnd duration (toDuration's fallback for the
    // unknown "untilOwnerTurnEnd" string) would drop the buff here.
    advance(s.engine).ledgers.continuous.sweep(s.state, "ownerTurnEnd", 1);
    advance(s.engine).ledgers.modifiers.sweep(s.state, "ownerTurnEnd", 1);
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("blast").currentDP).toBe(baseDp + 3000);
    expect(observe(s.engine).keywordAmount(s.perm("blast"), "SecurityAttack")).toBe(1);
    // End of the CONTROLLER's own turn expires it.
    s.state.turnSeat = 0;
    advance(s.engine).ledgers.continuous.sweep(s.state, "ownerTurnEnd", 0);
    advance(s.engine).ledgers.modifiers.sweep(s.state, "ownerTurnEnd", 0);
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("blast").currentDP).toBe(baseDp);
  });

  it("rejects a third DigiXros material beyond the printed two", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "blast" },
            { card: "EX10-026", as: "first" },
            { card: "EX10-027", as: "second" },
            { card: "EX10-039", as: "third" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 13;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("blast").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("first").instanceId, s.inst("second").instanceId, s.inst("third").instanceId],
        },
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("DigiXroses with exactly 2 Bagra Army cards for 4 less", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "blast" },
            { card: "EX10-026", as: "first" },
            { card: "EX10-027", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 13;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("blast").instanceId,
        digiXros: { materialInstanceIds: [s.inst("first").instanceId, s.inst("second").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));
    expect(s.state.memory).toBe(4);
  });
});
