import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-036.js";
import "./EX1-032.js";

describe("EX1-032 Magnadramon", () => {
  it("Q3217: may trash the top security card and unsuspend even when already unsuspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-029", as: "base" }],
          hand: [{ card: "EX1-032", as: "evo" }],
          security: [
            { card: "BT1-009", as: "securityTop" },
            { card: "BT1-010", as: "securityBelow" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("securityTop").instanceId));

    expect(s.perm("base").topCard.cardId).toBe("EX1-032");
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityTop").instanceId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("securityBelow").instanceId]);
    expect(s.state.memory).toBe(2);
  });

  it("may decline the When Digivolving cost and leave a suspended stack and security unchanged", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-029", as: "base", suspended: true }],
          hand: [{ card: "EX1-032", as: "evo" }],
          security: [
            { card: "BT1-009", as: "securityTop" },
            { card: "BT1-010", as: "securityBelow" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-032");

    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("securityTop").instanceId,
      s.inst("securityBelow").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(2);
  });

  it("recovers the deck top on a real player attack with exactly three security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-032", as: "magnadramon" }],
        security: [
          { card: "BT1-009", as: "existingTop" },
          { card: "BT1-010", as: "existingMiddle" },
          { card: "BT1-011", as: "existingBottom" },
        ],
        deck: [
          { card: "BT1-012", as: "recovered" },
          { card: "BT1-013", as: "deckBelow" },
        ],
      },
      1: {
        security: [
          { card: "BT1-014", as: "opponentTop" },
          { card: "BT1-009", as: "opponentBelow" },
        ],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magnadramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovered").instanceId));

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("recovered").instanceId,
      s.inst("existingTop").instanceId,
      s.inst("existingMiddle").instanceId,
      s.inst("existingBottom").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("deckBelow").instanceId]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("magnadramon").isSuspended).toBe(true);
  });

  it("does not recover when the controller has more than three security cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-032", as: "magnadramon" }],
        security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        deck: [{ card: "BT1-013", as: "notRecovered" }],
      },
      1: { security: ["BT1-014", "BT1-009"] },
    });
    await s.ready();
    const securityBefore = s.state.players[0]!.security.map((card) => card.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magnadramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual(securityBefore);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("notRecovered").instanceId]);
  });

  it("recovers only once across two real attacks in one turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-032", as: "magnadramon" }],
          security: ["BT1-009", "BT1-010"],
          hand: [{ card: "BT1-036", as: "unsuspender" }],
          deck: [
            { card: "BT1-011", as: "firstRecovery" },
            { card: "BT1-012", as: "secondRecovery" },
          ],
        },
        1: { security: ["BT1-013", "BT1-014", "BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack" as const,
        attackerPermanentId: s.perm("magnadramon").permanentId,
        target: { kind: "player" as const },
      });

    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 3 && s.state.players[1]!.security.length === 3);
    expect(s.state.players[0]!.security[0]?.instanceId).toBe(s.inst("firstRecovery").instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("magnadramon").isSuspended);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("magnadramon").isSuspended && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("secondRecovery").instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("secondRecovery").instanceId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("limits recovery to each controller, persists through the opponent turn, and resets next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-032", as: "mine" }],
        security: ["BT1-009", "BT1-010", "BT1-011"],
        deck: [
          { card: "BT1-011", as: "mineFirst" },
          { card: "BT1-014", as: "mineSecond" },
          { card: "BT1-012", as: "mineDrawNext" },
          { card: "BT1-013", as: "mineDraw" },
        ],
        hand: [{ card: "BT1-013", as: "mineSpare" }],
      },
      1: {
        battleArea: [{ card: "EX1-032", as: "theirs" }],
        security: ["BT1-013", "BT1-014", "BT1-009"],
        deck: [
          { card: "BT1-010", as: "theirsDraw" },
          { card: "BT1-009", as: "theirsRecovery" },
        ],
        hand: [{ card: "BT1-011", as: "theirsSpare" }],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mine").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 4);
    expect(s.state.players[0]!.security[0]?.instanceId).toBe(s.inst("mineFirst").instanceId);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("theirs").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 3);
    expect(s.state.players[1]!.security[0]?.instanceId).toBe(s.inst("theirsRecovery").instanceId);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mine").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 4);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("rejects evolution from a yellow level-4 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-028", as: "invalidSource" }],
        hand: [{ card: "EX1-032", as: "evo" }],
        security: ["BT1-009", "BT1-010"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("invalidSource").permanentId,
        instanceId: s.inst("evo").instanceId,
      }).ok,
    ).toBe(false);

    expect(s.perm("invalidSource").topCard.cardId).toBe("EX1-028");
    expect(s.perm("invalidSource").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("evo").instanceId]);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(5);
  });
});
