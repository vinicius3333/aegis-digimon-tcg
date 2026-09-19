import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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
      digivolutionRequirement: [{ names: ["Magnamon"], colorCount: 2, cost: 5, isAlternate: true }],
    });
    expect(matchingAlternateDigivolutionRequirement("BT16-102", "BT21-036")).toMatchObject({
      names: ["Magnamon"],
      colorCount: 2,
      cost: 5,
      isAlternate: true,
    });
    expect(matchingAlternateDigivolutionRequirement("BT16-102", "BT16-102")).toBeUndefined();
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
    s.state.memory = 5;
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

    expect(s.state.memory).toBe(0);
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

  it("allows its When Digivolving unsuspend while Sonic Shot forbids only the next unsuspend phase", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT24-095", as: "sonicShot" }],
        },
        1: {
          security: ["BT1-001"],
          battleArea: [
            { card: "BT21-036", as: "base" },
            { card: "BT1-009", as: "shotAttacker" },
          ],
          hand: [{ card: "BT16-102", as: "magna" }],
          deck: ["BT1-013", "BT1-013", "BT1-013", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    try {
      await advance(s.engine).waitForMainPhase(1);
      preferred.push(s.perm("base").topCard!.instanceId);
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("shotAttacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT24-095")).toBe(true);
      expect(observe(s.engine).isRestricted(s.perm("base"), "unsuspendDuringOwnUnsuspendPhase")).toBe(true);
      expect(s.perm("base").topCard?.cardId).toBe("BT21-036");
      expect(s.perm("base").isSuspended).toBe(true);
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("magna").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "BT16-102");
      await settle();
      expect(s.perm("base").currentDP).toBe(15000);
      expect(s.perm("base").isSuspended).toBe(false);
      expect(observe(s.engine).isRestricted(s.perm("base"), "unsuspendDuringOwnUnsuspendPhase")).toBe(false);
      expect(observe(s.engine).isRestricted(s.perm("base"), "beAffected")).toBe(true);
    } finally {
      advance(s.engine).endMainPhaseIfOpen(1);
      await firstTurn;
    }
  });

  it("unsuspends from its All Turns effect on the opponent's turn under Sonic Shot's pending phase lock", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT24-095", as: "sonicShot" }],
          battleArea: [{ card: "BT1-009", as: "securityAttacker" }],
          deck: ["BT1-013", "BT1-013", "BT1-013", "BT1-013"],
        },
        1: {
          security: ["BT1-001"],
          battleArea: [
            { card: "BT21-036", as: "base" },
            { card: "BT1-009", as: "shotAttacker" },
          ],
          hand: [{ card: "BT16-102", as: "magna" }],
          deck: ["BT1-013", "BT1-013", "BT1-013", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    try {
      await advance(s.engine).waitForMainPhase(1);
      preferred.push(s.perm("base").topCard!.instanceId);
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("shotAttacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      expect(observe(s.engine).isRestricted(s.perm("base"), "unsuspendDuringOwnUnsuspendPhase")).toBe(true);
      expect(s.perm("base").isSuspended).toBe(true);

      s.state.memory = 5;
      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("magna").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "BT16-102");
      await settle();
      s.perm("base").isSuspended = true;
    } finally {
      advance(s.engine).endMainPhaseIfOpen(1);
      await firstTurn;
    }

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("securityAttacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === 0);
      await settle(() => !observe(s.engine).isAttacking());
      await settle();

      expect(s.perm("base").isSuspended).toBe(false);
    } finally {
      advance(s.engine).endMainPhaseIfOpen(0);
      await opponentTurn;
    }
  });

  it("keeps the Sonic Shot lock through immunity until Magnamon X's next unsuspend phase", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT24-095", as: "sonicShot" }],
          deck: ["BT1-013", "BT1-013", "BT1-013", "BT1-013"],
        },
        1: {
          security: ["BT1-001"],
          battleArea: [
            { card: "BT21-036", as: "base" },
            { card: "BT1-009", as: "shotAttacker" },
          ],
          hand: [{ card: "BT16-102", as: "magna" }],
          deck: ["BT1-013", "BT1-013", "BT1-013", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    try {
      await advance(s.engine).waitForMainPhase(1);
      preferred.push(s.perm("base").topCard!.instanceId);
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("shotAttacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      expect(observe(s.engine).isRestricted(s.perm("base"), "unsuspendDuringOwnUnsuspendPhase")).toBe(true);
      expect(s.perm("base").isSuspended).toBe(true);

      s.state.memory = 5;
      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("magna").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "BT16-102");
      await settle();
      expect(s.perm("base").isSuspended).toBe(false);
      s.perm("base").isSuspended = true;
    } finally {
      advance(s.engine).endMainPhaseIfOpen(1);
      await firstTurn;
    }

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    try {
      await advance(s.engine).waitForMainPhase(0);
    } finally {
      advance(s.engine).endMainPhaseIfOpen(0);
      await opponentTurn;
    }

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const nextOwnerTurn = s.engine.runOneTurn();
    try {
      await advance(s.engine).waitForMainPhase(1);
      expect(s.perm("base").isSuspended).toBe(true);
      expect(observe(s.engine).isRestricted(s.perm("base"), "unsuspendDuringOwnUnsuspendPhase")).toBe(false);
    } finally {
      advance(s.engine).endMainPhaseIfOpen(1);
      await nextOwnerTurn;
    }
  });
});
