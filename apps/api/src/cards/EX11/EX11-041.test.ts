import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

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
              // FAILS-WHEN-REVERTED: without detachPermanentTop the whole permanent is moved
              // and its digivolution cards are trashed (KB Q5875/Q5888).
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

  it("flips the next face-down security, de-digivolves, and free-evolves on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }], hand: [{ card: "EX11-043", as: "invisimon" }] },
        1: {
          security: [
            { card: "BT1-001", faceUp: true },
            { card: "BT1-002", faceUp: false },
          ],
          battleArea: [{ card: "BT1-080", as: "opponent", under: ["BT1-009"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const opponent = s.perm("opponent");
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.state.players[1]!.security[0]).toMatchObject({ faceUp: true });
    expect(s.state.players[1]!.security[1]).toMatchObject({ faceUp: true });
    expect(opponent.stack).toHaveLength(0);
    expect(opponent.topCard.cardId).toBe("BT1-009");
    expect(s.perm("source").topCard.cardId).toBe("EX11-043");
    assertNoLoudGap(s);
  });

  it("pays 3 from a Machine-only level-4 base and the ordinary 4 from a non-Machine base", async () => {
    const valid = setupEngine({
      0: {
        battleArea: [{ card: "BT12-086", as: "machineBase" }],
        hand: [{ card: cardId, as: "oblivimon" }],
        deck: ["BT1-001", "BT1-002"],
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
        deck: ["BT1-001", "BT1-002"],
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

  /**
   * KB Q5875 / Q5888: "this Digimon's top stacked card" is the permanent's OWN top card. Only
   * that card leaves for security; the digivolution cards stay and the next one is promoted.
   * FAILS-WHEN-REVERTED: dropping `detachPermanentTop` moves the whole permanent to security
   * and trashes the stack, so the survivor lookup and the empty-trash assertion both flip.
   */
  it("sheds only its own top card to the security bottom and promotes the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source", under: ["BT1-009", "BT1-019"] }],
          security: ["BT1-019"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const permanentId = s.perm("source").permanentId;
    const promotedInstanceId = s.perm("source").stack.at(-1)!.instanceId;
    await advance(s.engine).fireSubTrigger("whenCheckedFaceUpSecurity", {
      attackerPermanentId: permanentId,
      securityInstanceId: s.state.players[0]!.security[0]!.instanceId,
    });
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
