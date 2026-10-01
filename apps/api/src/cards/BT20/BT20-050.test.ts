import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-050.js";
import "../BT1/BT1-036.js";
import "../BT19/BT19-079.js";
import "../BT5/BT5-037.js";
import "./index.js";

describe("BT20-050 HoverEspimon", () => {
  it("flips the next face-down opposing security card when digivolving", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [{ kind: "SecurityManipulation", op: "flipFaceUp", controller: "opponent" }],
    });
  });

  it("draws once at end of attack and grants inherited +1000 DP", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfAttack")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    });
  });

  it("publishes HoverEspimon's catalog identity and exact Cyborg/Machine alternate route", () => {
    expect(getCardDefinition("BT20-050")).toMatchObject({
      cardId: "BT20-050",
      nameEn: "HoverEspimon",
      colors: ["Black", "Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 3 },
        { color: "Blue", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Cyborg", "LIBERATOR"],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, traits: ["Cyborg", "Machine"], cost: 2, isAlternate: true },
    ]);
    expect(matchingAlternateDigivolutionRequirement("BT20-050", "BT20-046")).toMatchObject({
      level: 3,
      traits: ["Cyborg", "Machine"],
      cost: 2,
    });
    expect(matchingAlternateDigivolutionRequirement("BT20-050", "BT20-010")).toBeUndefined();
  });

  it("uses the Cyborg route for 2 and flips the next face-down security card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-046", as: "base" }], hand: [{ card: "BT20-050", as: "hover" }] },
      1: { security: [{ card: "BT1-009", faceUp: true }, "BT1-010", "BT1-011"] },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("hover").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-050");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.security.map((card) => card.faceUp)).toEqual([true, true, false]);
  });

  it("keeps the ordinary black evolution route distinct from the Cyborg/Machine alternate", async () => {
    const ordinary = setupEngine({
      0: { battleArea: [{ card: "BT20-048", as: "base" }], hand: [{ card: "BT20-050", as: "hover" }] },
    });
    ordinary.state.memory = 3;
    expect(
      ordinary.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ordinary.perm("base").permanentId,
        instanceId: ordinary.inst("hover").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => ordinary.perm("base").topCard.cardId === "BT20-050" && ordinary.state.pendingDecision === undefined,
    );
    expect(ordinary.state.memory).toBe(0);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT20-007", as: "redBase" }], hand: [{ card: "BT20-050", as: "hover" }] },
    });
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("redBase").permanentId,
        instanceId: invalid.inst("hover").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(invalid.perm("redBase").topCard.cardId).toBe("BT20-007");
  });

  it("draws once across two public attacks, then draws again after the next turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-050", as: "hover" }],
          hand: [
            { card: "BT1-036", as: "firstGarurumon" },
            { card: "BT1-036", as: "secondGarurumon" },
          ],
          security: Array.from({ length: 8 }, () => "BT1-101"),
          deck: [
            { card: "BT1-009", as: "firstDraw" },
            { card: "BT1-010", as: "secondDraw" },
            { card: "BT1-011", as: "thirdDraw" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "opponentAttacker" }],
          security: Array.from({ length: 8 }, () => "BT1-101"),
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 10;
    preferred.push(s.perm("hover").permanentId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hover").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length >= 1);
    expect(s.state.players[0]!.hand).toHaveLength(3);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstGarurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("hover").isSuspended);
    expect(s.state.memory).toBe(4);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hover").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length >= 2);
    expect(s.state.players[0]!.hand).toHaveLength(2);

    s.state.turnSeat = 1;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondGarurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("hover").isSuspended);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hover").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length >= 3);
    expect(s.state.players[0]!.hand).toHaveLength(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("grants its inherited host +1000 DP on both players' turns", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-052", dp: 7000, under: ["BT20-050"], as: "host" }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(8000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(8000);
  });
});

describe("BT20-050 HoverEspimon — KB Q&A rulings", () => {
  async function digivolveIntoHoverEspimon(s: EngineSetup): Promise<void> {
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("hover").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-050" && s.state.pendingDecision === undefined);
  }

  async function attackPlayerWithHoverEspimon(s: EngineSetup): Promise<void> {
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "securityChecked") &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );
  }

  it("flips the 2nd security card when only the top one is already face up (Q4370)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-046", as: "base" }], hand: [{ card: "BT20-050", as: "hover" }] },
      1: {
        security: [
          { card: "BT1-009", faceUp: true, as: "alreadyFaceUp" },
          { card: "BT1-010", as: "second" },
          { card: "BT1-011", as: "third" },
        ],
      },
    });
    await digivolveIntoHoverEspimon(s);
    const security = s.state.players[1]!.security;
    expect(security.map((card) => card.instanceId)).toEqual([
      s.inst("alreadyFaceUp").instanceId,
      s.inst("second").instanceId,
      s.inst("third").instanceId,
    ]);
    expect(s.inst("alreadyFaceUp").faceUp).toBe(true);
    expect(s.inst("second").faceUp).toBe(true);
    expect(s.inst("third").faceUp).toBe(false);
  });

  it("keeps a flipped card revealed in place as an ordinary security card (Q4371)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-046", as: "base" }],
        hand: [{ card: "BT20-050", as: "hover" }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: {
        security: [{ card: "BT1-010", as: "flipped" }, "BT1-011", "BT1-012"],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    await digivolveIntoHoverEspimon(s);
    expect(s.inst("flipped").faceUp).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    const security = s.state.players[1]!.security;
    expect(security).toHaveLength(3);
    expect(security[0]?.instanceId).toBe(s.inst("flipped").instanceId);
    expect(s.inst("flipped").faceUp).toBe(true);
    expect(security.slice(1).every((card) => !card.faceUp)).toBe(true);
  });

  it("checks a face-up security card as a normal security check and battles it (Q4372)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-046", as: "base" }],
        hand: [{ card: "BT20-050", as: "hover" }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: {
        security: [
          { card: "BT1-009", as: "monodramon" },
          { card: "BT1-010", as: "remaining" },
        ],
      },
    });
    await digivolveIntoHoverEspimon(s);
    expect(s.inst("monodramon").faceUp).toBe(true);

    await attackPlayerWithHoverEspimon(s);

    expect(s.events.flatMap((event) => (event.kind === "securityRevealed" ? [event.revealedCardId] : []))).toEqual([
      "BT1-009",
    ]);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("remaining").instanceId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("monodramon").instanceId);
    expect(s.perm("base").topCard.cardId).toBe("BT20-050");
  });

  it("activates the [Security] effect of a security card checked while face up (Q4373)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-046", as: "base" }],
          hand: [{ card: "BT20-050", as: "hover" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { security: [{ card: "BT19-079", as: "taiki" }, "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await digivolveIntoHoverEspimon(s);
    expect(s.inst("taiki").faceUp).toBe(true);

    await attackPlayerWithHoverEspimon(s);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("taiki").instanceId,
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("taiki").instanceId);
  });

  it("turns every face-up card face down when that security stack is shuffled (Q4374)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-046", as: "base" }],
          hand: [{ card: "BT20-050", as: "hover" }],
        },
        1: {
          hand: [{ card: "BT5-037", as: "gladimon" }],
          security: [{ card: "BT1-009", faceUp: true }, "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await digivolveIntoHoverEspimon(s);
    const securityBefore = s.state.players[1]!.security;
    expect(securityBefore.map((card) => card.faceUp)).toEqual([true, true, false, false]);
    const instanceIdsBefore = securityBefore.map((card) => card.instanceId).sort();

    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gladimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT5-037") &&
        s.state.pendingDecision === undefined,
    );

    const securityAfter = s.state.players[1]!.security;
    expect(securityAfter.map((card) => card.instanceId).sort()).toEqual(instanceIdsBefore);
    expect(securityAfter.map((card) => card.faceUp)).toEqual([false, false, false, false]);
  });
});
