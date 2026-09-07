import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-080.js";

// BT23-006 Huckmon is a Lv.3 [CS] Digimon; its only effect is [On Play], so a seeded
// board copy stays inert and makes a clean deletion subject.
const CS_SUBJECT = "BT23-006";
// BT1-026 Breakdramon is a vanilla Lv.6 11000 DP <Piercing> attacker (Q5355).
const PIERCER = "BT1-026";

describe("BT23-080 Yu Nogi", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-080")).toMatchObject({
      cardId: "BT23-080",
      nameEn: "Yu Nogi",
      colors: ["Blue", "Yellow"],
      kinds: ["Tamer"],
      playCost: 4,
      dp: 0,
      types: ["CS"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    // The catalog text carries non-breaking spaces, so compare on normalized whitespace.
    expect(getCardDefinition("BT23-080")!.effectText!.replace(/\s+/g, " ")).toBe(
      "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory. " +
        "[All Turns] When any of your Digimon with the [CS] trait would be deleted, by returning this Tamer " +
        "to the bottom of the deck, place 1 of those Digimon as the top security card.",
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("carries the three printed clauses as IR", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "opponentHas",
            filter: { controllerDefault: "opponent", kind: ["Digimon"], zone: "battleArea" },
          },
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            zone: "battleArea",
            nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
          },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "placeAsSecurity",
              controller: "mine",
              source: { count: 1, sourceRef: "triggerSubject" },
              toTop: true,
              cost: {
                kind: "return",
                to: "deckBottom",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    });
  });

  // --- Clause 1: [Start of Your Main Phase] --------------------------------------------

  it.each([
    ["opposing Digimon present", true],
    ["opponent board empty", false],
  ])("gains start-of-main memory only when the %s", async (_label, opponentHasDigimon) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-080", as: "yu" }],
          hand: [{ card: "ST1-02", as: "neutral" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: opponentHasDigimon ? [{ card: "BT1-009", as: "opponent" }] : [],
          hand: [{ card: "ST1-02", as: "opponentNeutral" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(opponentHasDigimon ? 1 : 0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT23-080")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ignores an opponent Digimon that is only in the breeding area", async () => {
    // Comprehensive rules 3-4-5-8: information on cards in the breeding area can't be
    // referenced, so a lone breeding-area Digimon does not satisfy "your opponent has a
    // Digimon".
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-080", as: "yu" }],
          hand: [{ card: "ST1-02", as: "neutral" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          breeding: { card: "BT1-009", as: "opponentEgg" },
          hand: [{ card: "ST1-02", as: "opponentNeutral" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.breeding?.topCard?.cardId).toBe("BT1-009");
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not gain memory at the start of the opponent's main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-080", as: "yu" }],
          hand: [{ card: "ST1-02", as: "neutral" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          hand: [{ card: "ST1-02", as: "opponentNeutral" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    // Seat 1 opened its main phase with the passed-turn memory only: Yu's clause is
    // [Start of YOUR Main Phase] and must stay silent here.
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // --- Clause 2: [All Turns] deletion replacement ---------------------------------------

  it("Q5355: replaces battle deletion of a [CS] Digimon, so the attacker's <Piercing> never checks security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-080", as: "yu" },
            { card: CS_SUBJECT, as: "subject", suspended: true },
          ],
          hand: [{ card: "ST1-02", as: "neutral" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: PIERCER, as: "piercer" }],
          hand: [{ card: "ST1-02", as: "opponentNeutral" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const subjectPermanentId = s.perm("subject").permanentId;
    const subjectCardId = s.perm("subject").topCard!.instanceId;
    const yuCardId = s.inst("yu").instanceId;
    const piercerPermanentId = s.perm("piercer").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    // Seat 0's Active phase unsuspended its own board, so arm the defender now: an
    // attack may only target a suspended Digimon.
    s.perm("subject").isSuspended = true;
    const deckSizeBefore = s.state.players[0]!.deck.length;

    const securityBefore = s.state.players[0]!.security.map((card) => card.instanceId);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: piercerPermanentId,
        target: { kind: "permanent", permanentId: subjectPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.security.length > securityBefore.length);

    // The subject left the battle area, but as a security placement, not a deletion.
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === subjectPermanentId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === subjectCardId)).toBe(false);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([subjectCardId, ...securityBefore]);
    // Q5355: no security check happened, so the defender's own security is untouched
    // beneath the newly placed card and nothing was trashed from it.
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
    // Cost paid: Yu left the battle area for the BOTTOM of the deck.
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === yuCardId)).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(deckSizeBefore + 1);
    expect(s.state.players[0]!.deck.at(-1)!.instanceId).toBe(yuCardId);
    // The attacker survived and stays suspended after its attack.
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === piercerPermanentId)).toBe(true);
    expect(s.perm("piercer").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("declining the cost leaves Yu in play, deletes the [CS] Digimon and lets <Piercing> check security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-080", as: "yu" },
            { card: CS_SUBJECT, as: "subject", suspended: true },
          ],
          hand: [{ card: "ST1-02", as: "neutral" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: PIERCER, as: "piercer" }],
          hand: [{ card: "ST1-02", as: "opponentNeutral" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const subjectPermanentId = s.perm("subject").permanentId;
    const subjectCardId = s.perm("subject").topCard!.instanceId;
    const yuCardId = s.inst("yu").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    // Seat 0's Active phase unsuspended its own board, so arm the defender now: an
    // attack may only target a suspended Digimon.
    s.perm("subject").isSuspended = true;

    const securityBefore = s.state.players[0]!.security.map((card) => card.instanceId);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("piercer").permanentId,
        target: { kind: "permanent", permanentId: subjectPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.security.length < securityBefore.length);

    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === subjectPermanentId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === subjectCardId)).toBe(true);
    // Yu stays on the battle area: the cost was never paid.
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === yuCardId)).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === yuCardId)).toBe(false);
    // <Piercing> fired: exactly one security card was checked off the top.
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual(securityBefore.slice(1));
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ignores a deleted Digimon without the [CS] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-080", as: "yu" },
            { card: "BT1-009", as: "plain", suspended: true },
          ],
          hand: [{ card: "ST1-02", as: "neutral" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: PIERCER, as: "piercer" }],
          hand: [{ card: "ST1-02", as: "opponentNeutral" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const plainPermanentId = s.perm("plain").permanentId;
    const plainCardId = s.perm("plain").topCard!.instanceId;
    const yuCardId = s.inst("yu").instanceId;
    const securityBefore = s.state.players[0]!.security.length;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    s.perm("plain").isSuspended = true;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("piercer").permanentId,
        target: { kind: "permanent", permanentId: plainPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !observe(s.engine).isAttacking() && s.state.players[0]!.trash.some((c) => c.instanceId === plainCardId),
    );

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === plainCardId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === yuCardId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(securityBefore - 1);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === plainCardId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // --- Clause 3: [Security] --------------------------------------------------------------

  it("plays itself from security without paying its 4 cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST1-02", as: "neutral" }],
          security: [{ card: "BT23-080", as: "securityYu" }, "BT1-009", "BT1-010"],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          hand: [{ card: "ST1-02", as: "opponentNeutral" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const yuCardId = s.inst("securityYu").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === yuCardId));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === yuCardId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === yuCardId)).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(2);
    // The 4 play cost was not paid: memory only moved by the attacker's own security check.
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
