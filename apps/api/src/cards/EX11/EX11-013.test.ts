import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX11-013 Sangomon", () => {
  it("encodes both entry timings, the exact hand boundary, and only the inherited once-per-turn effect", () => {
    const compiled = runtimeCompiledCard("EX11-013")!;

    for (const trigger of ["WhenMoving", "OnPlay"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Draw",
            controller: "mine",
            amount: 1,
            condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 7 },
          },
        ],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfAttack")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
    expect(compiled.effects.some((effect) => effect.isSecurity)).toBe(false);
  });

  it("draws on play when the post-placement hand has exactly seven cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX11-013", as: "sangomon" },
            "BT1-001",
            "BT1-001",
            "BT1-001",
            "BT1-001",
            "BT1-001",
            "BT1-001",
            "BT1-001",
          ],
          deck: [{ card: "BT1-002", as: "drawn" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sangomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("does not draw on play when the post-placement hand has eight cards", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "EX11-013", as: "sangomon" },
          "BT1-001",
          "BT1-001",
          "BT1-001",
          "BT1-001",
          "BT1-001",
          "BT1-001",
          "BT1-001",
          "BT1-001",
        ],
        deck: [{ card: "BT1-002", as: "notDrawn" }],
      },
    });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sangomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX11-013"));

    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("notDrawn").instanceId);
    assertNoLoudGap(s);
  });

  it("draws through the production breeding-to-battle move timing", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX11-013", as: "sangomon" },
        hand: ["BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
        deck: [{ card: "BT1-002", as: "drawn" }],
      },
    });
    s.state.phase = Phase.Breeding;

    expect(
      s.engine.applyIntent(0, {
        type: "moveFromBreeding",
        permanentId: s.perm("sangomon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX11-013")).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(8);
    assertNoLoudGap(s);
  });

  it("gains memory once across two real attacks when inherited", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX11-013"] }] },
      1: { security: ["BT1-001", "BT1-002", "BT1-003"] },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("does not gain memory when Sangomon is the standalone top card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-013", as: "sangomon" }] },
      1: { security: ["BT1-001", "BT1-002"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sangomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("digivolves from a blue level 2 for 0 and rejects an off-color level 2", () => {
    const valid = setupEngine({
      0: { breeding: { card: "BT1-003", as: "blueEgg" }, hand: [{ card: "EX11-013", as: "sangomon" }] },
    });

    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("blueEgg").permanentId,
        instanceId: valid.inst("sangomon").instanceId,
      }),
    ).toEqual({ ok: true });
    expect(valid.state.memory).toBe(0);

    const invalid = setupEngine({
      0: { breeding: { card: "BT1-001", as: "redEgg" }, hand: [{ card: "EX11-013", as: "sangomon" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("redEgg").permanentId,
        instanceId: invalid.inst("sangomon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
