import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
import { EffectTiming } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
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

const cardId = "EX11-041";

describe("EX11-041 Oblivimon", () => {
  it("preserves printed stats, Cyborg evolution, security effects, and attack-target inheritance", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Oblivimon",
      colors: ["Black", "Blue"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Black", level: 4, memoryCost: 4 },
        { color: "Blue", level: 4, memoryCost: 4 },
      ],
      types: ["Cyborg", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, traits: ["Cyborg", "Machine"], cost: 3, isAlternate: true },
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
        kind: "DeDigivolve",
        amount: 1,
        target: { filter: { controller: "opponent", kind: ["Digimon"] } },
      });
      expect(effect.actions[2]).toMatchObject({
        kind: "Digivolve",
        from: ["hand"],
        condition: { kind: "isOpponentsTurn" },
      });
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "EndOfOpponentsTurn", isSecurity: true }),
    );
    expect(compiled.effects.find(({ trigger, isInherited }) => trigger === "YourTurn" && !isInherited)).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenCheckedFaceUpSecurity",
          sourceFilter: { controllerDefault: "mine" },
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
    expect(compiled.effects.find(({ isInherited }) => isInherited)?.actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "attackTargetChange",
    });
  });

  it("plays itself from face-up security at the end of the opponent's turn", async () => {
    const s = setupEngine({
      0: { hand: ["BT1-009"] },
      1: { security: [{ card: cardId, faceUp: true }] },
    });
    await s.ready();
    const sourceId = s.state.players[1]!.security[0]!.instanceId;

    await advance(s.engine).runTurn(0);

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard.instanceId === sourceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("loses after its end-of-opponent-turn security play leaves zero security before an effect attack succeeds (Q5874)", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: cardId, as: "oblivimon", faceUp: true }] },
        1: {
          battleArea: [
            { card: "BT17-081", as: "tamer" },
            { card: "BT5-086", as: "omnimon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const oblivimonInstanceId = s.inst("oblivimon").instanceId;

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    await settle(() => s.state.gameOver);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === oblivimonInstanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT5-086")).toBe(true);
    expect(s.perm("omnimon").isSuspended).toBe(true);
    expect(s.state.winnerSeat).toBe(1);
    assertNoLoudGap(s);
  });

  it.each([
    { owner: 1 as const, faceUp: false, reason: "face-down security" },
    { owner: 0 as const, faceUp: true, reason: "its owner's own turn" },
  ])("does not play from $reason", async ({ owner, faceUp }) => {
    const s = setupEngine({
      0: { hand: ["BT1-009"], security: owner === 0 ? [{ card: cardId, faceUp }] : [] },
      1: { security: owner === 1 ? [{ card: cardId, faceUp }] : [] },
    });
    await s.ready();
    const sourceId = s.state.players[owner]!.security[0]!.instanceId;

    await advance(s.engine).runTurn(0);

    expect(s.state.players[owner]!.security.map(({ instanceId }) => instanceId)).toContain(sourceId);
    expect(s.state.players[owner]!.battleArea.some(({ topCard }) => topCard.instanceId === sourceId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("publicly plays, flips the next face-down security, and de-digivolves one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "EX11-043", as: "invisimon" },
          ],
        },
        1: {
          security: [
            { card: "BT1-013", faceUp: true },
            { card: "BT1-014", faceUp: false },
          ],
          battleArea: [{ card: "BT1-080", as: "opponent", under: ["BT1-009"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === cardId));
    expect(s.state.players[1]!.security[0]).toMatchObject({ faceUp: true });
    expect(s.state.players[1]!.security[1]).toMatchObject({ faceUp: true });
    expect(s.perm("opponent").stack).toHaveLength(0);
    expect(s.perm("opponent").topCard.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("invisimon").instanceId);
    assertNoLoudGap(s);
  });

  it("pays 3 from a Machine-only level-4 base and the ordinary 4 from a non-Machine base", async () => {
    const valid = setupEngine({
      0: {
        battleArea: [{ card: "BT12-086", as: "machineBase" }],
        hand: [{ card: cardId, as: "oblivimon" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    await valid.ready();
    valid.state.memory = 3;
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("machineBase").permanentId,
        instanceId: valid.inst("oblivimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("machineBase").topCard.cardId === cardId);
    expect(valid.perm("machineBase").topCard.cardId).toBe(cardId);
    expect(valid.state.memory).toBe(0);
    expect(valid.perm("machineBase").stack.map((card) => card.cardId)).toEqual(["BT12-086"]);

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-037", as: "wrongBase" }],
        hand: [{ card: cardId, as: "oblivimon" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    await invalid.ready();
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("wrongBase").permanentId,
        instanceId: invalid.inst("oblivimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => invalid.perm("wrongBase").topCard.cardId === cardId);
    expect(invalid.state.memory).toBe(-1);
    expect(invalid.perm("wrongBase").stack.map((card) => card.cardId)).toEqual(["BT1-037"]);
    assertNoLoudGap(valid);
    assertNoLoudGap(invalid);
  });

  it("sheds only its own top card to the security bottom and promotes the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source", under: ["BT1-009", "BT1-019"] }],
          security: ["BT1-019"],
        },
        1: {
          security: [
            { card: "BT1-013", faceUp: true },
            { card: "BT1-019", faceUp: false },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const permanentId = s.perm("source").permanentId;
    const promotedInstanceId = s.perm("source").stack.at(-1)!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.at(-1)?.cardId === cardId);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ cardId, faceUp: true });
    const survivor = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === permanentId);
    expect(survivor).toBeDefined();
    expect(survivor!.topCard.instanceId).toBe(promotedInstanceId);
    expect(survivor!.stack.map(({ cardId: id }) => id)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("keeps the permanent and the security stack untouched when the optional placement is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source", under: ["BT1-009", "BT1-019"] }],
          security: ["BT1-019"],
        },
        1: {
          security: [
            { card: "BT1-013", faceUp: true },
            { card: "BT1-019", faceUp: false },
          ],
        },
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
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.security.map(({ cardId: id }) => id)).toEqual(["BT1-019"]);
    expect(s.perm("source").topCard.cardId).toBe(cardId);
    assertNoLoudGap(s);
  });
});

describe("EX11-041 Oblivimon — KB Q&A rulings", () => {
  it("flips the 2nd security card when only the top one is already face up (Q5867)", async () => {
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

  it("keeps a security card it turns face up revealed to both players as an ordinary security card (Q5868)", async () => {
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

  it("checks a face-up security card with it left revealed, otherwise like any security check (Q5869)", async () => {
    const s = await expectFaceUpCardCheckedNormally("BT1-013");
    expect(s.events.find((event) => event.kind === "securityChecked")).toMatchObject({ resolution: "battle" });
  });

  it("activates a face-up security card's [Security] effect when it is checked (Q5870)", async () => {
    const s = await checkFaceUpSecurity("EX11-062");

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("checked").instanceId,
    ]);
  });

  it("turns face-up security cards face down when the security stack is shuffled (Q5871)", async () => {
    const s = await shuffleSecurityHolding([cardId]);

    expect(s.state.players[0]!.security.map(({ cardId: id }) => id)).toContain(cardId);
    expect(allSecurityFaceDown(s, 0)).toBe(true);
  });

  it("activates the checked card's [Security] effect before its face-up-check placement (Q5872)", async () => {
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

  it("triggers the [End of Attack] effect of the Digimon left on top after the placement (Q5873)", async () => {
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

  it("ends the attack when placing its top card leaves only Marvin Jackson, a Tamer (Q5875)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "oblivimon" },
            { card: "BT15-086", as: "marvin" },
          ],
        },
        1: { security: [{ card: "BT1-013", faceUp: true }, "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const [mindLink] = observe(s.engine).activatableEffects(s.perm("marvin")) as { effectKey: string }[];
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("marvin").topCard.instanceId,
        effectKey: mindLink!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("oblivimon").stack.some(({ cardId: sourceId }) => sourceId === "BT15-086"));
    const attackerId = s.perm("oblivimon").permanentId;

    await attackPlayer(s, 0, "oblivimon");

    const remaining = s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === attackerId);
    expect(remaining?.topCard.cardId).toBe("BT15-086");
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ cardId, faceUp: true });
    expect(s.events.find((event) => event.kind === "securityChecked")?.battle).toBeUndefined();
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
