import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-040.js";

describe("LM-040 Vikemon", () => {
  it("trashes any four opposing digivolution cards across the opponent's Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-041", as: "base" }], hand: [{ card: "LM-040", as: "vikemon" }] },
        1: {
          battleArea: [
            { card: "BT1-041", as: "first", under: ["BT1-009", "BT1-009"] },
            { card: "BT1-041", as: "second", under: ["BT1-009", "BT1-009"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("vikemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length === 4, 2000);

    expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT1-009")).toHaveLength(4);
    expect(s.perm("first").stack.length + s.perm("second").stack.length).toBe(0);
  });

  it("unsuspends itself when no opposing Digimon matches its stack depth", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-040", as: "vikemon", under: ["BT1-009", "BT1-009"] }] },
        1: {
          battleArea: [{ card: "BT1-041", as: "shallow", under: ["BT1-009"] }],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("vikemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("vikemon").isSuspended, 2000);

    expect(s.perm("vikemon").isSuspended).toBe(false);
  });

  it("stays suspended while the opponent matches its stack depth", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-040", as: "vikemon", under: ["BT1-009"] }] },
        1: {
          battleArea: [{ card: "BT1-041", as: "deep", under: ["BT1-009", "BT1-009"] }],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("vikemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision == null);

    expect(s.perm("vikemon").isSuspended).toBe(true);
  });

  it("still applies -6000 to the opponent's Security Digimon when the unsuspend condition fails, per Q4843", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-040", as: "vikemon", under: ["BT1-009"] }] },
        1: {
          battleArea: [{ card: "BT1-041", as: "deep", under: ["BT1-009", "BT1-009"] }],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("vikemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).securityDp(1) === -6000, 2000);

    expect(observe(s.engine).securityDp(1)).toBe(-6000);
  });

  it("spends the attacking clause once per turn and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["BT1-009"],
          battleArea: [{ card: "LM-040", as: "vikemon", under: ["BT1-009"] }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-041", as: "shallow" }],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("vikemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).securityDp(1) === -6000, 2000);
    await settle(() => !observe(s.engine).isAttacking());
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("vikemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(observe(s.engine).securityDp(1)).toBe(-6000);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).securityDp(1)).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("vikemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).securityDp(1) === -6000, 2000);
    await settle(() => !observe(s.engine).isAttacking());
    expect(observe(s.engine).securityDp(1)).toBe(-6000);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-040");
    const compiled = runtimeCompiledCard("LM-040");
    expect(definition?.nameEn).toBe("Vikemon");
    expect(definition?.colors).toEqual(["Blue", "Yellow"]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects[0]).toMatchObject({ keywords: [{ keyword: "IceClad" }] });
  });
});
