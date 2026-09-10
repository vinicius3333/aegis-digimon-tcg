import { getCardDefinition } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js"; // register the BT20 compiled cards so the real activateEffect path runs
import { compiled } from "./BT20-102.js";

/**
 * A3 for BT20-102 (Omnimon (X Antibody)) — the [When Digivolving] mass-delete's survivor.
 *
 *   [On Play] [When Digivolving] If [Omnimon]/[X Antibody] is in this Digimon's
 *   digivolution cards, choose 1 of both players' Digimon and delete all OTHER
 *   Digimon. Then, return 1 of your opponent's Digimon to the bottom of the deck.
 *
 * `Target.except` (a nested `{ filter, count, selector }`) is meant to carve the
 * chosen survivor out of the `count: "all"` delete. Before this fix the interpreter
 * never read `except`, so the delete matched every Digimon on the board with no
 * survivor at all — including the Digimon that just digivolved into BT20-102 itself.
 *
 * FAILS-WHEN-REVERTED: dropping the `except` carve-out (via `resolveExceptSurvivors`
 * in the interpreter) makes the chosen survivor get deleted along with everything
 * else, and the "still on the board" assertion below flips to false.
 */

const OMNIMON_XA = "BT20-102";
const OMNIMON_BASE = "BT5-086"; // Lv.7 [Omnimon], satisfies the "[Omnimon]" alternate digivolve requirement
const OWN_OTHER = "AD1-011"; // an unrelated own Digimon, must be deleted (not the chosen survivor)
const OPPONENT_DIGIMON = "AD1-004"; // an unrelated opponent Digimon, must be deleted

describe("BT20-102 — [When Digivolving] mass-delete spares the chosen survivor (Target.except)", () => {
  it("matches the catalog identity, printed clauses, Q&A seam, and complete IR coverage", () => {
    expect(getCardDefinition("BT20-102")).toMatchObject({
      cardId: "BT20-102",
      nameEn: "Omnimon (X Antibody)",
      colors: ["Blue", "White", "Red"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 16,
      dp: 16000,
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Holy Warrior", "X Antibody", "Royal Knight", "LIBERATOR"],
      evoCosts: [
        { color: "Blue", level: 6, memoryCost: 6 },
        { color: "Red", level: 6, memoryCost: 6 },
      ],
      maxCountInDeck: 4,
    });
    const printed = getCardDefinition("BT20-102")!;
    const effectText = printed.effectText!.replaceAll("\u00a0", " ");
    expect(effectText).toContain(
      "[On Play] [When Digivolving] If [Omnimon]/[X Antibody] is in this Digimon's digivolution cards, choose 1 of both players' Digimon and delete all other Digimon. Then, return 1 of your opponent's Digimon to the bottom of the deck.",
    );
    expect(effectText).toContain(
      "[End of Your Turn] [Once Per Turn] 1 of your Digimon may gain ＜Rush＞ for the turn and attack without suspending.",
    );
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("grants Rush and then offers the same Digimon an unsuspending attack", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Rush" },
          duration: "forTheTurn",
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Attack",
          target: { sameTarget: true },
          withoutSuspending: true,
          drainTimingWindowDuringAttack: true,
          condition: { kind: "ifThisEffectActed" },
        },
      ],
    });
  });

  it("checks exact Omnimon or X Antibody trait in both entry timings and the alternate route", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const entryEffect = compiled.effects.find((entry) => entry.trigger === trigger);

      expect(entryEffect?.actions[0]).toMatchObject({
        condition: {
          kind: "selfDigivolutionStackMatchesFilter",
          filter: {
            nameOrTrait: [
              { tokens: ["Omnimon"], match: "nameExact" },
              { tokens: ["X Antibody"], match: "nameExact" },
            ],
          },
        },
      });
    }

    expect(compiled.digivolutionRequirement).toContainEqual({
      namesExact: ["Omnimon"],
      cost: 2,
      isAlternate: true,
    });
  });

  it("keeps the chosen survivor (itself) while deleting every other Digimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: OMNIMON_BASE, as: "base" },
            { card: OWN_OTHER, as: "ownOther" },
          ],
          hand: [{ card: OMNIMON_XA, as: "evolving" }],
        },
        1: {
          battleArea: [{ card: OPPONENT_DIGIMON, as: "oppOther" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds },
    );
    s.state.memory = 10;

    const base = s.perm("base");
    const ownOther = s.perm("ownOther");
    const oppOther = s.perm("oppOther");
    const evolving = s.inst("evolving");

    // Bias the "choose 1 of both players' Digimon" prompt toward sparing the digivolved
    // permanent itself.
    preferInstanceIds.push(base.topCard.instanceId);

    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: evolving.instanceId });

    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[0]!.battleArea.length === 1);

    // The chosen survivor (this Digimon itself) is still on the board ...
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === base.permanentId)).toBe(true);
    // ... while every OTHER Digimon on either side was deleted.
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === ownOther.permanentId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === oppOther.permanentId)).toBe(false);
  });

  it("returns the chosen opposing survivor to the bottom of deck after the public entry deletion", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: OMNIMON_BASE, as: "base" }],
          hand: [{ card: OMNIMON_XA, as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: "AD1-004", as: "survivor", dp: 12000 },
            { card: "AD1-011", as: "deleted", dp: 8000 },
          ],
          deck: ["BT20-047"],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 2;
    const survivorInstanceId = s.perm("survivor").topCard.instanceId;
    preferInstanceIds.push(survivorInstanceId);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(survivorInstanceId);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("AD1-004");
    expect(s.state.memory).toBe(0);
  });

  it("skips the conditional delete but still performs Then on a public play without the stack condition", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: OMNIMON_XA, as: "unqualified" }],
          battleArea: ["BT20-092", { card: OWN_OTHER, as: "ownOther" }],
          deck: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: OPPONENT_DIGIMON, as: "oppOther" },
            { card: "AD1-011", as: "oppSecond" },
          ],
          deck: ["BT20-047"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 16;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unqualified").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
      expect.arrayContaining([OMNIMON_XA, OWN_OTHER]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe(OPPONENT_DIGIMON);
  });

  it.each([
    ["trait-only X Antibody Digimon", "BT9-008", false],
    ["exact X Antibody Option", "BT9-109", true],
    ["Proto Form Rule Name", "EX5-070", true],
  ] as const)("uses exact bracket-name semantics for %s in the stack", async (_label, sourceCard, qualifies) => {
    const stackSources =
      sourceCard === "BT9-008" ? ["BT9-008", "BT15-009", "BT20-014"] : [sourceCard, "BT20-008", "BT15-009", "BT20-014"];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-018", as: "base", under: stackSources },
            { card: OWN_OTHER, as: "ownOther" },
          ],
          hand: [{ card: OMNIMON_XA, as: "evolving" }],
        },
        1: { battleArea: [{ card: OPPONENT_DIGIMON, as: "oppOther" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === OMNIMON_XA);
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(qualifies ? 1 : 2);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === OWN_OTHER)).toBe(!qualifies);
  });

  it("grants Rush and attacks without suspending at the end of your turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: OMNIMON_XA, as: "omnimon" }] },
        1: { security: ["BT1-010"], deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const omnimonId = s.perm("omnimon").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(
      () =>
        s.state.players[1]!.security.length === 0 &&
        s.events.some((event) => event.kind === "attackDeclared" && event.attackerPermanentId === omnimonId),
    );

    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "attackDeclared", attackerPermanentId: omnimonId, attackerCardId: OMNIMON_XA }),
    );
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "securityRevealed", attackerPermanentId: omnimonId }),
    );
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.perm("omnimon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not attack when the optional Rush choice is declined (Q4417)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: OMNIMON_XA, as: "omnimon" }], deck: ["BT20-010", "BT20-010"] },
        1: { security: ["BT1-010"], deck: ["BT20-010", "BT20-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle();

    expect(observe(s.engine).hasAttackedThisTurn(s.perm("omnimon"))).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not declare a second attack from simultaneous copies (Q4419)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: OMNIMON_XA, as: "first" },
            { card: OMNIMON_XA, as: "second" },
          ],
          deck: ["BT20-010", "BT20-010", "BT20-010"],
        },
        1: { security: ["BT1-010"], deck: ["BT20-010", "BT20-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;
    const attackBaseline = s.events.filter((event) => event.kind === "attackDeclared").length;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(
      () =>
        s.state.players[1]!.security.length === 0 &&
        s.events.filter((event) => event.kind === "attackDeclared").length === attackBaseline + 1,
    );

    const attackDeclarations = s.events.filter((event) => event.kind === "attackDeclared").slice(attackBaseline);
    expect(attackDeclarations).toHaveLength(1);
    expect([firstId, secondId]).toContain(attackDeclarations[0]!.attackerPermanentId);
    // BT20-102 has no Security Attack +1. One declaration means exactly one check remains;
    // the second simultaneous copy must not declare a second attack (Q4419).
    expect(s.events.filter((event) => event.kind === "securityRevealed")).toHaveLength(1);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("accepts the printed Rush choice and attacks even when the chosen Digimon is suspended (Q4418)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: OMNIMON_XA, as: "omnimon" }],
          deck: ["BT20-010", "BT20-010"],
        },
        1: { security: ["BT1-010", "BT1-010"], deck: ["BT20-010", "BT20-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const omnimonId = s.perm("omnimon").permanentId;
    const attackBaseline = s.events.filter((event) => event.kind === "attackDeclared").length;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: omnimonId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("omnimon").isSuspended &&
        s.events.filter((event) => event.kind === "attackDeclared").length === attackBaseline + 1,
    );
    expect(s.perm("omnimon").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(
      () =>
        s.state.players[1]!.security.length === 0 &&
        s.events.filter((event) => event.kind === "attackDeclared").length === attackBaseline + 2,
    );

    const attacks = s.events.filter((event) => event.kind === "attackDeclared").slice(attackBaseline);
    expect(attacks).toHaveLength(2);
    expect(attacks.every((event) => event.attackerPermanentId === omnimonId)).toBe(true);
    expect(s.events.filter((event) => event.kind === "securityRevealed")).toHaveLength(2);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
