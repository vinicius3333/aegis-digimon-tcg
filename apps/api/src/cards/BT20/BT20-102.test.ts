import { getCardDefinition } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import "../BT23/BT23-013.js";
import "../BT23/BT23-076.js";
import "../BT18/BT18-082.js";
import "../EX10/EX10-052.js";
import "../EX11/EX11-053.js";
import { compiled } from "./BT20-102.js";

const OMNIMON_XA = "BT20-102";
const OMNIMON_BASE = "BT5-086";
const OWN_OTHER = "AD1-011";
const OPPONENT_DIGIMON = "AD1-004";

describe("BT20-102 — [When Digivolving] mass-delete spares the chosen survivor (Target.except)", () => {
  it("does not retroactively trigger when obtained during the VPS SaviorHuckmon end-turn chain", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-014", as: "base" },
            { card: "BT23-076", as: "sistermon" },
          ],
          hand: [
            { card: "BT23-013", as: "jesmon" },
            { card: OMNIMON_XA, as: "omnimon" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: { security: ["BT1-010"], deck: ["BT1-010", "BT1-010"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    for (const [cardId, accept] of [
      ["BT20-014", true],
      ["BT23-013", false],
      ["BT23-076", true],
    ] as const) {
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(s.decisions.at(-1)?.req.sourceCardId).toBe(cardId);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept },
        }),
      ).toEqual({ ok: true });
      await settle();
    }
    await settle(() => s.state.turnSeat === 1);
    expect(s.perm("base").topCard.cardId).toBe(OMNIMON_XA);
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    s.engine.applyIntent(1, { type: "surrender" });
    await loop;
  });

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

    preferInstanceIds.push(base.topCard.instanceId);

    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: evolving.instanceId });

    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === base.permanentId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === ownOther.permanentId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === oppOther.permanentId)).toBe(false);
  });

  it("spares one Digimon of each player, so choosing an opposing survivor keeps itself (Discord 1555074299344191549)", async () => {
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
    preferInstanceIds.push(s.perm("survivor").topCard.instanceId, s.perm("base").topCard.instanceId);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("base").permanentId,
    ]);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe(OMNIMON_XA);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("AD1-004");
  });

  it("keeps itself when Omekamon's On Play digivolves it as its controller's only Digimon (Discord 1555074299344191549)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT20-083", as: "omekamon" },
            { card: OMNIMON_XA, as: "omnimonX" },
          ],
          security: ["BT20-010"],
        },
        1: {
          battleArea: [
            { card: "AD1-004", as: "survivor" },
            { card: "AD1-011", as: "deleted" },
          ],
          deck: ["BT20-047"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 5;
    const survivor = s.perm("survivor");
    const deleted = s.perm("deleted");
    preferInstanceIds.push(survivor.topCard.instanceId);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omekamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.pendingDecision === undefined);

    const survivorPrompts = s.decisions.filter(
      ({ req }) => req.kind === "chooseTargets" && req.sourceCardId === OMNIMON_XA,
    );
    expect(survivorPrompts[0]?.req.options?.candidateInstanceIds).toEqual([survivor.permanentId, deleted.permanentId]);
    expect(survivorPrompts[0]?.req.options?.targetFate).toBeUndefined();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe(OMNIMON_XA);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("AD1-011");
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("AD1-004");
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

describe("BT20-102 Omnimon (X Antibody) — KB Q&A rulings", () => {
  it("still returns 1 opposing Digimon to the deck bottom when the stack condition is not met (Q4725)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST1-10", as: "base" },
            { card: OWN_OTHER, as: "ownOther" },
          ],
          hand: [{ card: OMNIMON_XA, as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: OPPONENT_DIGIMON, as: "oppFirst" },
            { card: "AD1-011", as: "oppSecond" },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const opponentDigimonIds = [s.perm("oppFirst").topCard.instanceId, s.perm("oppSecond").topCard.instanceId];

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();

    expect(s.perm("base").topCard.cardId).toBe(OMNIMON_XA);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual(
      expect.arrayContaining([s.perm("base").permanentId, s.perm("ownOther").permanentId]),
    );
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(opponentDigimonIds).toContain(s.state.players[1]!.deck.at(-1)?.instanceId);
  });

  it("keeps the Rush it granted for the turn when Alphamon's memory gain continues the turn (Q4726)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: OMNIMON_XA, as: "omnimon" },
            { card: "BT20-060", as: "alphamon" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: { security: ["BT1-010", "BT1-010", "BT1-010"], deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("omnimon").topCard.instanceId);
    await s.ready();
    const omnimonId = s.perm("omnimon").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const turnCount = s.state.turnCount;
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(
      () =>
        s.state.players[1]!.security.length === 2 &&
        s.events.some((event) => event.kind === "attackDeclared" && event.attackerPermanentId === omnimonId),
    );
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    expect(s.state.turnSeat).toBe(0);
    expect(s.state.turnCount).toBe(turnCount);
    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasKeyword(s.perm("omnimon"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("alphamon"), "Rush")).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("omnimon"), "Rush")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("meets the stack condition when Omekamon's [On Deletion] placed itself under the played Omnimon (Q5907)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          security: ["BT1-013"],
          hand: [{ card: OMNIMON_XA, as: "omnimonX" }],
          battleArea: [
            { card: "EX11-053", as: "omekamon", suspended: true },
            { card: OWN_OTHER, as: "ownOther" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-080", as: "attacker", dp: 20_000 },
            { card: OPPONENT_DIGIMON, as: "oppOther" },
          ],
          security: ["BT1-013"],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("omnimonX").instanceId);
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("omekamon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await advance(s.engine).finishAttack();

    const omnimon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === OMNIMON_XA);
    expect(omnimon?.stack.map((card) => card.instanceId)).toContain(s.inst("omekamon").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("ownOther").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain(OPPONENT_DIGIMON);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-080");
  });

  it("still returns an opposing Digimon after a would-leave effect removed this Omnimon mid-effect (Q6018)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: OMNIMON_BASE, as: "base" }],
          hand: [{ card: OMNIMON_XA, as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: "EX10-052", as: "leavingLucemon" },
            { card: OPPONENT_DIGIMON, as: "returned" },
          ],
          security: ["BT1-010", "BT1-010"],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    const returnedId = s.perm("returned").topCard.instanceId;
    preferInstanceIds.push(s.inst("evolving").instanceId, returnedId);
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("evolving").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("EX10-052");
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(returnedId);
  });
});
