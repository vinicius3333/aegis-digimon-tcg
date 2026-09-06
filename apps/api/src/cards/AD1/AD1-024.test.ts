import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-024 Imperialdramon: Fighter Mode", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-024");
    const compiled = registeredCompiledCards.get("AD1-024") ?? getCompiledCard("AD1-024");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-024");
    expect(definition?.nameEn).toBe("Imperialdramon: Fighter Mode");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });

  it("suspends an opposing Digimon and unsuspends itself when a Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-024", as: "fighter", suspended: true }],
          hand: [{ card: "BT1-010", as: "played" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").isSuspended && !s.perm("fighter").isSuspended);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("fighter").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("unsuspends even when there is no opposing Digimon to suspend (Q6916)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-024", as: "fighter", suspended: true }],
          hand: [{ card: "BT1-010", as: "played" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("fighter").isSuspended === false);
    expect(s.perm("fighter").isSuspended).toBe(false);
  });

  it("self-triggers after effect-driven evolution and returns the suspended Digimon (Q6115)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-011", as: "paildramon" }], hand: [{ card: "AD1-024", as: "fighter" }] },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }], security: ["BT1-001"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("paildramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("paildramon").topCard.cardId === "AD1-024");
    await settle(() => s.state.players[1]!.battleArea.length === 0, 5000);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.some((card) => card.cardId === "BT1-010")).toBe(true);
  });

  it("reacts when the opponent plays a Digimon as well as when I play one", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-024", as: "fighter", suspended: true }] },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }], hand: [{ card: "BT1-010", as: "played" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").isSuspended && !s.perm("fighter").isSuspended);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("fighter").isSuspended).toBe(false);
  });

  it("shares one use between when-digivolving and when-attacking lowest-DP returns", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-030", as: "base" }], hand: [{ card: "AD1-024", as: "fighter" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "low", dp: 5000 },
            { card: "BT1-010", as: "high", dp: 6000 },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("fighter").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("high").permanentId);
  });

  it("uses both alternate evolution routes and publishes its two keywords", async () => {
    for (const [baseCard, expectedMemory] of [
      ["BT12-030", 5],
      ["AD1-011", 1],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCard, as: "base" }], hand: [{ card: "AD1-024", as: "fighter" }] },
      });
      s.state.memory = 6;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("fighter").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "AD1-024");
      expect(s.state.memory).toBe(expectedMemory);
    }

    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-024", as: "fighter" }] } });
    await s.ready();
    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("fighter").permanentId, "SecurityAttack")).toBe(true);
    expect(continuous.hasKeyword(s.perm("fighter").permanentId, "Blocker")).toBe(true);
  });
});
