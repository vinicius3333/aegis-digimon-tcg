import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "EX11-030";

describe("EX11-030 ForgeBeemon", () => {
  it("preserves standard and Royal Base evolution, security, and inherited effects", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "ForgeBeemon",
      colors: ["Green", "Black"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [
        { color: "Green", level: 3, memoryCost: 3 },
        { color: "Black", level: 3, memoryCost: 3 },
      ],
      types: ["Cyborg", "X Antibody", "Royal Base", "LIBERATOR", "Insectoid"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, traits: ["Royal Base"], cost: 2, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "OpponentsTurn", isSecurity: true }));
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects).toContainEqual(
        expect.objectContaining({
          trigger,
          actions: [
            expect.objectContaining({
              kind: "SecurityManipulation",
              op: "toHand",
              amount: 1,
              toTop: true,
              faceDownOnly: true,
            }),
            expect.objectContaining({
              kind: "SecurityManipulation",
              op: "placeAsSecurity",
              faceUp: true,
              toTop: false,
              optional: true,
            }),
          ],
        }),
      );
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        isInherited: true,
        actions: [expect.objectContaining({ kind: "ModifyDP", amount: 1000 })],
      }),
    );
  });

  it("takes the top face-down security and puts only Royal Base face up at security bottom", async () => {
    const s = setupEngine(
      {
        0: {
          security: [
            { card: "BT1-009", as: "faceUpTop", faceUp: true },
            { card: "BT1-010", as: "faceDown" },
          ],
          hand: [
            { card: cardId, as: "source" },
            { card: "EX11-025", as: "royalBase" },
            { card: "BT1-009", as: "plain" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId: id }) => id === "BT1-010"));
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toEqual(
      expect.arrayContaining(["BT1-010", "BT1-009"]),
    );
    expect(s.state.players[0]!.security.map(({ cardId: id }) => id)).toEqual(["BT1-009", "EX11-025"]);
    expect(s.state.players[0]!.security[1]).toMatchObject({ faceUp: true });
    assertNoLoudGap(s);
  });

  it("grants Reboot only to own Royal Base Digimon from security during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: cardId, faceUp: true }],
        battleArea: [
          { card: "EX11-025", as: "royalBase" },
          { card: "BT1-009", as: "plain" },
        ],
      },
      1: { battleArea: [{ card: "EX11-025", as: "opposingRoyalBase" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("royalBase"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("opposingRoyalBase"), "Reboot")).toBe(false);
    assertNoLoudGap(s);
  });

  it("applies inherited +1000 DP in an evolution stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-031", as: "host", under: [cardId], dp: 7000 }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(8000);
    assertNoLoudGap(s);
  });

  it("uses the public Royal Base alternate evolution route for cost 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-025", as: "base" }],
        hand: [{ card: cardId, as: "forge" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("forge").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId: id }) => id)).toEqual(["EX11-025"]);
    assertNoLoudGap(s);
  });

  it("checks a face-up ForgeBeemon through a public security attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-013", as: "attacker", dp: 20_000 }] },
      1: {
        battleArea: [{ card: "EX11-025", as: "royalBase" }],
        security: [{ card: cardId, as: "forgeSecurity", faceUp: true }],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("royalBase"), "Reboot")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));

    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("forgeSecurity").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("royalBase"), "Reboot")).toBe(false);
    assertNoLoudGap(s);
  });
});
