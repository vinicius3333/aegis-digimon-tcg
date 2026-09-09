import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

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
              // FAILS-WHEN-REVERTED: without detachPermanentTop the whole permanent leaves for
              // security and its digivolution cards are trashed (KB Q5875/Q5887/Q5888).
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

  /**
   * Public attack proof for the security placement path. Promotion of the remaining stack is
   * recorded as an engine limitation when the attack resolves.
   */
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

  it("rechecks face-up security after the promoted Invisimon takes the next own turn", async () => {
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
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.security.filter(({ cardId: id }) => id === cardId)).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    s.engine.applyIntent(1, { type: "surrender" });
    await loop;
    assertNoLoudGap(s);
  });
});
