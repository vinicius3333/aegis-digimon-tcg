import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-041.js";

describe("LM-041 Regalecusmon", () => {
  it("unsuspends a DS Digimon, returns security, and restricts an opposing permanent at 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-028", as: "ds", suspended: true },
            { card: "EX12-030", as: "base" },
          ],
          hand: [{ card: "LM-041", as: "regalecusmon" }],
        },
        1: { security: [{ card: "BT1-009" }], battleArea: [{ card: "BT1-085", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("regalecusmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.length === 1 && !s.perm("ds").isSuspended);

    expect(s.perm("ds").isSuspended).toBe(false);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    const opponent = s.state.players[1]!.battleArea[0];
    expect(opponent).toBeDefined();
    expect(observe(s.engine).isRestricted(opponent!, "beSuspended")).toBe(true);
  });

  it("skips security return at zero memory but still applies the Then suspend lock", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-041", as: "regalecusmon" }] },
        1: { security: ["BT1-009", "BT1-010"], battleArea: [{ card: "BT1-085", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("regalecusmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision == null);

    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "beSuspended")).toBe(true);
  });

  it("skips the suspend lock above one memory", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-041", as: "regalecusmon" }] },
        1: { security: [{ card: "BT1-009" }], battleArea: [{ card: "BT1-085", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("regalecusmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.length === 1, 2000);

    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "beSuspended")).toBe(false);
  });

  it("unsuspends a DS Digimon when played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-030", as: "ds", suspended: true }],
          hand: [{ card: "LM-041", as: "regalecusmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("regalecusmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("ds").isSuspended, 2000);

    expect(s.perm("ds").isSuspended).toBe(false);
  });

  it("shares the Once Per Turn security clause and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-028", as: "ds", suspended: true },
            { card: "EX12-030", as: "base" },
          ],
          hand: [{ card: "LM-041", as: "regalecusmon" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-085", as: "opponent" }],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          deck: ["BT1-009", "BT1-010"],
          hand: ["BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("regalecusmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.length === 2);
    expect(s.state.memory).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.hand).toHaveLength(2);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.length === 4);
    expect(s.state.players[1]!.hand).toHaveLength(4);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-041");
    const compiled = runtimeCompiledCard("LM-041");
    expect(definition?.nameEn).toBe("Regalecusmon");
    expect(definition?.colors).toEqual(["Blue", "Black"]);
    expect(definition?.types).toEqual(["Aquatic", "DS"]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });
});
