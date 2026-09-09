import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-055.js";

describe("EX11-055 Chitose Horaiji", () => {
  it("preserves the printed dual-color Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-055")).toMatchObject({
      nameEn: "Chitose Horaiji",
      colors: ["Red", "Purple"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("trashes a Composite card to draw and gain memory on play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX11-055", as: "chitose" }, "AD1-006"], deck: ["BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chitose").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.memory === 2 && s.state.players[0]!.trash.some((card) => card.cardId === "AD1-006"),
      600,
    );

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "AD1-006")).toBe(true);
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("suspends after a Composite deletion and plays an exact Gazimon from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-055", as: "chitose" },
            { card: "AD1-006", as: "composite", suspended: true },
          ],
          hand: [{ card: "BT10-071", as: "gazimon" }],
        },
        1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 20_000 }], security: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("composite").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "AD1-006"));
    expect(s.perm("chitose").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("gazimon").instanceId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("accepts a Wicked God deletion and plays an exact Gizamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-055", as: "chitose" },
            { card: "BT19-075", as: "wickedGod", suspended: true },
          ],
          hand: [{ card: "BT14-008", as: "gizamon" }],
        },
        1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 20_000 }], security: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wickedGod").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT19-075"));
    expect(s.perm("chitose").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("gizamon").instanceId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("declines the suspend cost after a Composite deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-055", as: "chitose" },
            { card: "AD1-006", as: "composite", suspended: true },
          ],
          hand: [{ card: "BT10-071", as: "gazimon" }],
        },
        1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 20_000 }], security: ["BT1-013"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("composite").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "AD1-006"));
    expect(s.perm("chitose").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("gazimon").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("trashes a Composite card to draw and gain memory at the real start of main", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-055", as: "chitose" }],
          hand: ["AD1-006"],
          deck: ["BT1-009"],
        },
        1: { deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "AD1-006")).toBe(true);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT1-009")).toBe(true);
    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("plays itself from security through a public security check", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX11-055", as: "chitose", faceUp: false }] },
      1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 20_000 }], security: ["BT1-013"] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-055"));
    expect(s.state.players[0]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("ignores the deletion of a Digimon with neither Composite nor Wicked God", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-055", as: "chitose" },
            { card: "BT1-009", as: "plain", suspended: true },
          ],
          hand: [{ card: "BT10-071", as: "gazimon" }],
        },
        1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 20_000 }], security: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("plain").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-009"));
    expect(s.perm("chitose").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("gazimon").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not play a Gizamon-adjacent name that is not exactly Gazimon or Gizamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-055", as: "chitose" },
            { card: "AD1-006", as: "composite", suspended: true },
          ],
          hand: [{ card: "BT1-009", as: "notGazimon" }],
        },
        1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 20_000 }], security: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("composite").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "AD1-006"));

    // Monodramon is neither [Gazimon] nor [Gizamon], so nothing may be played. (Whether the
    // suspend cost should still be consumed is an engine-level preflight question, not this
    // card's contract, so it is deliberately not asserted here.)
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("notGazimon").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(false);
    assertNoLoudGap(s);
  });

  it("publishes full compiled coverage with coupled payments and exact deletion filters", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Trash", optional: true },
      { kind: "Draw", condition: { kind: "ifThisEffectActed" } },
      { kind: "GainMemory", condition: { kind: "ifThisEffectActed" } },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "onDeletionOf",
        sourceFilter: { controller: "mine", kind: ["Digimon"] },
        actions: [
          {
            kind: "PlayWithoutCost",
            target: { filter: { nameOrTrait: [{ tokens: ["Gazimon", "Gizamon"], match: "nameExact" }] } },
            cost: { kind: "suspend", target: { isSelf: true } },
          },
        ],
      },
    ]);
  });
});
