import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-102.js";
import "../index.js";

describe("BT16-102", () => {
  it("matches the immutable catalog contract and alternate Magnamon evolution", () => {
    expect(getCardDefinition("BT16-102")).toMatchObject({
      cardId: "BT16-102",
      nameEn: "Magnamon (X Antibody)",
      colors: ["Yellow", "Blue", "Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Yellow", level: 5, memoryCost: 4 },
        { color: "Blue", level: 5, memoryCost: 4 },
        { color: "Black", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Vaccine", "Free"],
      types: ["Holy Warrior", "X Antibody", "Royal Knight"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ multicolor: true, names: ["Magnamon"], cost: 5, isAlternate: true }],
    });
  });

  it("models Blocker and Armor Purge", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Blocker" }, { keyword: "Armor Purge" }],
    });
  });

  it("gains DP, immunity, and unsuspends when the Armor Form condition is met", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 3000,
      duration: "untilOpponentTurnEnd",
      condition: { kind: "selfDigivolutionStackHasTrait" },
    });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "GrantImmunity",
      immuneFrom: "opponentEffects",
      duration: "untilOpponentTurnEnd",
      condition: { kind: "selfDigivolutionStackHasTrait" },
    });
    expect(compiled.effects?.[1]?.actions?.[2]).toMatchObject({ kind: "Unsuspend" });
  });

  it("activates its When Digivolving effect after security removal and gains Free", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "any" },
          actions: [{ kind: "ActivateEffect", effectType: "WhenDigivolving", optional: true }],
        },
        { kind: "GrantStatic", grant: "trait", tokens: ["Free"] },
      ],
    });
  });

  it("naturally evolves from an Armor Form Magnamon and applies the conditional DP boost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-036", as: "base", suspended: true }],
          hand: [{ card: "BT16-102", as: "magna" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magna").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT16-102");

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT21-036"]);
    expect(s.perm("base").currentDP).toBe(15000);
    expect(s.perm("base").isSuspended).toBe(false);
  });

  it("naturally evolves from a level 5 without the stack condition and only unsuspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-038", as: "base", suspended: true }],
          hand: [{ card: "BT16-102", as: "magna" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magna").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT16-102");

    expect(s.perm("base").currentDP).toBe(12000);
    expect(s.perm("base").isSuspended).toBe(false);
  });

  it("unsuspends after a natural opponent security removal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-102", as: "magna", suspended: true },
            { card: "BT1-009", as: "attacker" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("magna").isSuspended).toBe(false);
  });

  it("unsuspends after a natural removal from its own security stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-102", as: "magna", suspended: true }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.perm("magna").isSuspended).toBe(false);
  });

  it("resolves its security-removal trigger only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-102", as: "magna", suspended: true },
            { card: "BT1-009", as: "firstAttacker" },
            { card: "BT1-009", as: "secondAttacker" },
          ],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.perm("magna").isSuspended).toBe(false);

    // The second security removal is a natural event in the same turn; re-suspend only
    // to make a second activation observable without injecting the event bus.
    s.perm("magna").isSuspended = true;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("magna").isSuspended).toBe(true);
  });

  it("can decline the optional When Digivolving activation after security removal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-102", as: "magna", suspended: true },
            { card: "BT1-009", as: "attacker" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("magna").isSuspended).toBe(true);
  });
});
