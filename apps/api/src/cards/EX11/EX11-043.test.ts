import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { EffectTiming } from "@aegis/shared";
import { identityVisibility } from "../ST24/tamerStack.testSupport.js";
import {
  allSecurityFaceDown,
  attackPlayer,
  checkFaceUpSecurity,
  eventIndex,
  expectFaceUpCardCheckedNormally,
  publicSecurity,
  shuffleSecurityHolding,
} from "./qaRulings.testSupport.js";

const cardId = "EX11-043";

describe("EX11-043 Invisimon", () => {
  it("preserves printed stats, trait evolution, face-up security, and attack effects", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Invisimon",
      colors: ["Black", "Blue"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 4 },
        { color: "Blue", level: 5, memoryCost: 4 },
      ],
      types: ["Cyborg", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Cyborg", "Machine"], cost: 3, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({
        kind: "SecurityManipulation",
        op: "flipUp",
        controller: "opponent",
        amount: 1,
      });
      expect(effect.actions[1]).toMatchObject({
        kind: "Return",
        to: "deckBottom",
        target: { filter: { controller: "opponent", superlative: "lowestPlayCost" } },
      });
      expect(effect.actions[2]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "SecurityAttack", amount: 1 },
        duration: "untilYourTurnEnd",
      });
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "EndOfOpponentsTurn", isSecurity: true }),
    );
    expect(compiled.effects.find(({ trigger }) => trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenCheckedFaceUpSecurity",
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addBottom",
              faceUp: true,
              optional: true,
              detachPermanentTop: true,
              source: { filter: { isSelfRef: true }, isSelf: true },
            },
          ],
        },
      ],
    });
  });

  it("flips the next face-down security, bottoms only the lowest-cost Digimon, and gains Security Attack +1", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: cardId, as: "source" }] },
        1: {
          deck: ["BT1-009"],
          security: [
            { card: "BT1-014", faceUp: true },
            { card: "BT1-015", faceUp: false },
          ],
          battleArea: [
            { card: "AD1-001", as: "cost5" },
            { card: "BT1-019", as: "cost6" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 12;
    preferred.push(s.perm("cost5").permanentId);
    const lowInstanceId = s.perm("cost5").topCard.instanceId;
    const highId = s.perm("cost6").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    expect(s.state.players[1]!.security.every(({ faceUp }) => faceUp)).toBe(true);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(lowInstanceId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(highId);
    expect(observe(s.engine).keywordAmount(s.perm("source"), "SecurityAttack")).toBe(1);
    assertNoLoudGap(s);
  });

  it("uses the public alternate Lv.5 Cyborg/Machine evolution for cost 3", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX11-042", as: "base" }], hand: [{ card: cardId, as: "evolver" }] },
        1: {
          security: [
            { card: "BT1-013", faceUp: true },
            { card: "BT1-014", faceUp: false },
          ],
          battleArea: [{ card: "BT1-080", as: "opponent" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolver").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.security.every(({ faceUp }) => faceUp)).toBe(true);
    assertNoLoudGap(s);
  });

  it("places Invisimon in security after a public face-up security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source", under: ["BT1-009"] }],
          security: ["BT1-019"],
        },
        1: { security: [{ card: "BT1-013", faceUp: true }], deck: ["BT1-019"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const permanentId = s.perm("source").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: permanentId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.at(-1)?.cardId === cardId);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ cardId, faceUp: true });
    assertNoLoudGap(s);
  });

  it("leaves the board and security untouched when the optional placement is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source", under: ["BT1-009"] }],
          security: ["BT1-019"],
        },
        1: { security: [{ card: "BT1-013", faceUp: true }], deck: ["BT1-019"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    expect(s.state.players[0]!.security.map(({ cardId: id }) => id)).toEqual(["BT1-019"]);
    expect(s.perm("source").topCard.cardId).toBe(cardId);
    assertNoLoudGap(s);
  });

  it("Q5887: ends the attack when the attacker's top becomes Marvin Jackson, a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "invisimon" },
            { card: "BT15-086", as: "marvin" },
          ],
        },
        1: { security: [{ card: "BT1-013", faceUp: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const [mindLink] = observe(s.engine).activatableEffects(s.perm("marvin")) as { effectKey: string }[];
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("marvin").topCard.instanceId,
        effectKey: mindLink!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("invisimon").stack.some(({ cardId: sourceId }) => sourceId === "BT15-086"));
    const attackerId = s.perm("invisimon").permanentId;
    const invisimonInstanceId = s.perm("invisimon").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.security.some(({ instanceId }) => instanceId === invisimonInstanceId)).toBe(true);
    expect(s.state.players[0]!.security.find(({ instanceId }) => instanceId === invisimonInstanceId)?.faceUp).toBe(
      true,
    );
    const remaining = s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === attackerId);
    expect(remaining?.topCard.cardId).toBe("BT15-086");
    expect(remaining?.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).not.toContain("BT15-086");
    expect(s.events.find((event) => event.kind === "securityChecked")?.battle).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("Q5888: uses the promoted Oblivimon for the second face-up security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-041", as: "oblivimon", under: ["BT1-009"] }],
          hand: [{ card: cardId, as: "invisimon" }],
        },
        1: {
          security: [
            { card: "BT1-013", faceUp: true },
            { card: "BT1-014", faceUp: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();
    const permanentId = s.perm("oblivimon").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: s.inst("invisimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("oblivimon").topCard.cardId === cardId);
    expect(observe(s.engine).keywordAmount(s.perm("oblivimon"), "SecurityAttack")).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();

    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(s.state.players[0]!.security.map(({ cardId: id, faceUp }) => ({ cardId: id, faceUp }))).toEqual([
      { cardId, faceUp: true },
      { cardId: "EX11-041", faceUp: true },
    ]);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toContain("BT1-009");
    expect(s.state.players[1]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("plays from security at the real end of the opponent's turn", async () => {
    const s = setupEngine({
      0: { security: [{ card: cardId, as: "securityInvisimon", faceUp: true }], deck: ["BT1-009"] },
      1: { security: ["BT1-013"], deck: ["BT1-014", "BT1-019"] },
    });
    s.state.turnSeat = 1;
    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("cannot place the promoted Invisimon once it has no stacked cards left", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source", under: [cardId] }],
          security: ["BT1-019"],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          security: [
            { card: "BT1-013", faceUp: true },
            { card: "BT1-014", faceUp: true },
            { card: "BT1-019", faceUp: true },
          ],
          deck: ["BT1-019"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some(({ cardId: id }) => id === cardId));
    expect(s.perm("source").topCard.cardId).toBe(cardId);
    expect(s.perm("source").stack).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 0);
    const decisionsBeforeAttack = s.decisions.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.security.filter(({ cardId: id }) => id === cardId)).toHaveLength(0);
    expect(s.decisions.slice(decisionsBeforeAttack).filter(({ req }) => req.kind === "optional")).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.perm("source").stack).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    s.engine.applyIntent(1, { type: "surrender" });
    await loop;
    assertNoLoudGap(s);
  });
});

describe("EX11-043 Invisimon — KB Q&A rulings", () => {
  it("flips the 2nd security card when only the top one is already face up (Q5879)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }] },
        1: {
          security: [
            { card: "BT1-013", faceUp: true },
            { card: "BT1-014", as: "second" },
            { card: "BT1-015", as: "third" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.security.map(({ faceUp }) => faceUp === true)).toEqual([true, true, false]);
    expect(identityVisibility(s, s.inst("second"))).toEqual({ owner: true, opponent: true });
  });

  it("keeps a security card it turns face up revealed to both players as an ordinary security card (Q5880)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }] },
        1: {
          security: [
            { card: "BT1-013", as: "flipped" },
            { card: "BT1-014", as: "hidden" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(publicSecurity(s, 1)).toEqual([
      { faceUp: true, cardId: "BT1-013" },
      { faceUp: false, cardId: "" },
    ]);
    expect(identityVisibility(s, s.inst("flipped"))).toEqual({ owner: true, opponent: true });
    expect(identityVisibility(s, s.inst("hidden")).opponent).toBe(false);
  });

  it("checks a face-up security card with it left revealed, otherwise like any security check (Q5881)", async () => {
    const s = await expectFaceUpCardCheckedNormally("BT1-013");
    expect(s.events.find((event) => event.kind === "securityChecked")).toMatchObject({ resolution: "battle" });
  });

  it("activates a face-up security card's [Security] effect when it is checked (Q5882)", async () => {
    const s = await checkFaceUpSecurity("EX11-062");

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("checked").instanceId,
    ]);
  });

  it("turns face-up security cards face down when the security stack is shuffled (Q5883)", async () => {
    const s = await shuffleSecurityHolding([cardId]);

    expect(s.state.players[0]!.security.map(({ cardId: id }) => id)).toContain(cardId);
    expect(allSecurityFaceDown(s, 0)).toBe(true);
  });

  it("activates the checked card's [Security] effect before its face-up-check placement (Q5884)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source", under: ["BT1-009", "BT1-019"], dp: 20_000 }] },
        1: { security: [{ card: "EX11-062", as: "shoto", faceUp: true }, "BT1-019"], deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await attackPlayer(s, 0, "source");

    const securityPlay = eventIndex(
      s,
      (event) => event.kind === "cardPlayed" && event.seat === 1 && event.cardId === "EX11-062",
    );
    const placement = eventIndex(s, (event) => event.kind === "effectTriggered" && event.sourceCardId === cardId);
    expect(securityPlay).toBeGreaterThanOrEqual(0);
    expect(placement).toBeGreaterThan(securityPlay);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ cardId, faceUp: true });
  });

  it("triggers the [End of Attack] effect of the Digimon left on top after the placement (Q5885)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source", under: ["BT20-050"], dp: 20_000 }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { security: [{ card: "BT1-011", faceUp: true }, "BT1-019"], deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const attackerId = s.perm("source").permanentId;

    await attackPlayer(s, 0, "source");

    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ cardId, faceUp: true });
    expect(s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === attackerId)?.topCard.cardId).toBe(
      "BT20-050",
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("loses when its end-of-opponent-turn security play leaves zero security before an effect attack succeeds (Q5886)", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: cardId, as: "invisimon", faceUp: true }] },
        1: {
          battleArea: [
            { card: "BT17-081", as: "tamer" },
            { card: "BT5-086", as: "omnimon" },
            { card: "BT1-009", as: "lowestCost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const invisimonInstanceId = s.inst("invisimon").instanceId;

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    await settle(() => s.state.gameOver);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === invisimonInstanceId)).toBe(true);
    expect(s.perm("omnimon").isSuspended).toBe(true);
    expect(s.state.winnerSeat).toBe(1);
  });
});
