import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
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
        0: { battleArea: [{ card: cardId, as: "source" }] },
        1: {
          deck: ["BT1-001"],
          security: [
            { card: "BT1-002", faceUp: true },
            { card: "BT1-003", faceUp: false },
          ],
          battleArea: [
            { card: "AD1-001", as: "cost5" },
            { card: "BT1-019", as: "cost6" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("cost5").permanentId);
    const lowInstanceId = s.perm("cost5").topCard.instanceId;
    const highId = s.perm("cost6").permanentId;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.state.players[1]!.security.every(({ faceUp }) => faceUp)).toBe(true);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(lowInstanceId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(highId);
    expect(observe(s.engine).keywordAmount(s.perm("source"), "SecurityAttack")).toBe(1);
    assertNoLoudGap(s);
  });

  /**
   * KB Q5887: with only BT15-086 [Marvin Jackson] underneath, placing "this Digimon's top
   * stacked card" leaves a TAMER permanent behind — proof that the card that leaves is
   * Invisimon itself and the digivolution card is promoted, not trashed.
   * FAILS-WHEN-REVERTED: without `detachPermanentTop` the whole permanent goes to security and
   * the Tamer is trashed, so both the survivor and the trash assertions flip.
   */
  it("sheds only Invisimon to the security bottom, leaving the promoted Tamer in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source", under: ["BT15-086"] }],
          security: ["BT1-019"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const permanentId = s.perm("source").permanentId;
    await advance(s.engine).fireSubTrigger("whenCheckedFaceUpSecurity", {
      attackerPermanentId: permanentId,
      securityInstanceId: s.state.players[0]!.security[0]!.instanceId,
    });
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ cardId, faceUp: true });
    const survivor = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === permanentId);
    expect(survivor).toBeDefined();
    expect(survivor!.topCard.cardId).toBe("BT15-086");
    expect(survivor!.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("leaves the board and security untouched when the optional placement is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source", under: ["BT15-086"] }],
          security: ["BT1-019"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenCheckedFaceUpSecurity", {
      attackerPermanentId: s.perm("source").permanentId,
      securityInstanceId: s.state.players[0]!.security[0]!.instanceId,
    });
    expect(s.state.players[0]!.security.map(({ cardId: id }) => id)).toEqual(["BT1-019"]);
    expect(s.perm("source").topCard.cardId).toBe(cardId);
    assertNoLoudGap(s);
  });
});
