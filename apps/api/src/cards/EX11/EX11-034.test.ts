import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "EX11-034";

describe("EX11-034 QueenBeemon", () => {
  it("preserves printed stats, Royal Base evolution, and both shared once-per-turn effects", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "QueenBeemon",
      colors: ["Green", "Black"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Green", level: 5, memoryCost: 4 },
        { color: "Black", level: 5, memoryCost: 4 },
      ],
      types: ["Cyborg", "X Antibody", "Royal Base", "LIBERATOR", "Insectoid"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Royal Base"], cost: 3, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const effects = compiled.effects.filter((effect) => effect.trigger === trigger);
      expect(effects[0]).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "SecurityManipulation",
            op: "addTopOrBottom",
            controller: "mine",
            faceUp: true,
            source: {
              filter: {
                controllerDefault: "mine",
                zone: ["hand", "trash"],
                nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
              },
            },
          },
          { kind: "DeleteBudget", budget: 8 },
        ],
      });
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenDigivolving",
        sharedUseKey: "ir-shared-1",
        actions: [
          expect.objectContaining({ kind: "PlayFromZone", costReductionScaling: expect.objectContaining({ per: 1 }) }),
        ],
      }),
    );
  });

  it("places Royal Base face up and uses it to raise the deletion budget to 10", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "EX11-025", as: "royalBase" },
          ],
          security: [{ card: "BT1-009", faceUp: true }],
        },
        1: { security: [{ card: "BT1-009" }], battleArea: [{ card: "BT1-080", as: "cost10" }] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 0,
      },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("cost10").permanentId),
    );
    expect(s.state.players[0]!.security[0]).toMatchObject({ cardId: "EX11-025", faceUp: true });
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("cost10").permanentId)).toBe(
      false,
    );
    assertNoLoudGap(s);
  });

  it("leaves a play cost 10 Digimon alive when the placement is declined and the budget stays 8", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "EX11-025", as: "royalBase" },
          ],
          security: [{ card: "BT1-009", faceUp: true }],
        },
        1: { security: [{ card: "BT1-009" }], battleArea: [{ card: "BT1-080", as: "cost10" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    const victimId = s.perm("cost10").permanentId;
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("royalBase").instanceId]);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === victimId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("takes the Royal Base placement from the trash as well as the hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          security: [{ card: "BT1-009", faceUp: true }],
          trash: [{ card: "EX11-025", as: "royalBase" }],
        },
        1: { security: [{ card: "BT1-009" }], battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    s.state.memory = 12;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security[0]).toMatchObject({ cardId: "EX11-025", faceUp: true });
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("exposes the placed face-up Royal Base Security-effect seam", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "EX11-025", as: "royalBase" },
          ],
          security: [],
        },
        1: { battleArea: [{ card: "BT1-083", as: "attacker" }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    s.state.memory = 12;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.security.some(
        ({ cardId: securityCardId, faceUp }) => securityCardId === "EX11-025" && faceUp,
      ),
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Reboot")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 30);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Reboot")).toBe(false);
    assertNoLoudGap(s);
  });

  it("digivolves publicly and resolves both shared effects with the face-up security reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-031", as: "host" }],
          hand: [
            { card: cardId, as: "queen" },
            { card: "EX11-025", as: "placed" },
            { card: "EX11-025", as: "played" },
            { card: "BT1-090", as: "nonRoyalBase" },
          ],
          security: [
            { card: "BT1-009", faceUp: true },
            { card: "BT1-010", faceUp: true },
          ],
        },
        1: { security: [{ card: "BT1-009" }], battleArea: [{ card: "BT1-080", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("queen").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("queen").instanceId);

    expect(s.perm("host").topCard.cardId).toBe(cardId);
    expect(
      s.state.players[0]!.security.some(({ cardId: placedCardId, faceUp }) => placedCardId === "EX11-025" && faceUp),
    ).toBe(true);
    expect(s.state.players[0]!.battleArea.some(({ topCard: placedCard }) => placedCard.cardId === "EX11-025")).toBe(
      true,
    );
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("victim").permanentId)).toBe(
      false,
    );
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("nonRoyalBase").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });

  it("resets both shared once-per-turn effects on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "queen" },
            { card: "EX11-025", as: "placedOne" },
            { card: "EX11-025", as: "playedOne" },
            { card: "EX11-025", as: "placedTwo" },
            { card: "EX11-025", as: "playedTwo" },
          ],
          security: [{ card: "BT1-009", faceUp: true }],
          deck: ["BT1-010", "BT1-012", "BT1-014", "BT1-015", "BT1-019"],
        },
        1: {
          security: ["BT1-009", "BT1-010", "BT1-012"],
          deck: ["BT1-014", "BT1-015", "BT1-019", "BT1-020", "BT1-021"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("queen").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    const firstFaceUpCount = s.state.players[0]!.security.filter(({ faceUp }) => faceUp).length;
    const firstRoyalBaseCount = s.state.players[0]!.battleArea.filter(
      ({ topCard }) => topCard.cardId === "EX11-025",
    ).length;
    expect(firstFaceUpCount).toBe(2);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    expect(s.perm("queen").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("queen").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security.filter(({ faceUp }) => faceUp)).toHaveLength(firstFaceUpCount + 1);
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX11-025")).toHaveLength(
      firstRoyalBaseCount + 1,
    );

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });
});
