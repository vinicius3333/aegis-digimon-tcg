import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-042.js";
import "./LM-039.js";

describe("LM-042 Rasielmon", () => {
  it("suspends one opposing permanent and locks one from unsuspending or digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-060", as: "base" }],
          hand: [{ card: "LM-042", as: "rasielmon" }, { card: "BT1-009" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-055", as: "opponent" },
            { card: "BT1-056", as: "attacker" },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          deck: ["BT1-009", "BT1-010"],
          hand: ["BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 12;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rasielmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").isSuspended, 2000);

    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspend")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "cannotActivateWhenDigivolving")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("puts both halves of the lock on the same chosen permanent", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-042", as: "rasielmon" }] },
        1: {
          battleArea: [
            { card: "BT1-055", as: "first" },
            { card: "BT1-056", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("second").permanentId);
    await s.ready();

    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rasielmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("second"), "unsuspend"), 2000);

    expect(observe(s.engine).isRestricted(s.perm("second"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("second"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("first"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("first"), "cannotActivateWhenDigivolving")).toBe(false);
  });

  it("lets the Then lock choose a different opponent permanent than the suspension", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-060", as: "base" }], hand: [{ card: "LM-042", as: "rasielmon" }] },
        1: {
          battleArea: [
            { card: "BT1-055", as: "suspendedTarget" },
            { card: "BT1-056", as: "lockedTarget" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rasielmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const suspendChoice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: suspendChoice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("suspendedTarget").permanentId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const lockChoice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: lockChoice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("lockedTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision == null);

    expect(s.perm("suspendedTarget").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("suspendedTarget"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("lockedTarget"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("lockedTarget"), "cannotActivateWhenDigivolving")).toBe(true);
  });

  it("places itself as the bottom security card when deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-042", as: "rasielmon", suspended: true }], security: [{ card: "BT1-009" }] },
        1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 13000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("rasielmon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2, 2000);

    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009", "LM-042"]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "LM-042")).toBe(false);
  });

  it("does not consume LM-039's shared budget when its When Digivolving timing is locked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "victim", dp: 3000 }],
          hand: [{ card: "LM-042", as: "rasielmon" }, { card: "BT1-009" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-024", as: "opponentBase" },
            { card: "BT1-085", as: "suspendTarget" },
          ],
          hand: [{ card: "LM-039", as: "evolution" }, { card: "BT1-009" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    s.state.memory = 6;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rasielmon").instanceId })).toEqual({
      ok: true,
    });
    for (const alias of ["suspendTarget", "opponentBase"] as const) {
      await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
      const choice = s.state.pendingDecision!;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: choice.decisionId,
          response: { kind: "chooseTargets", instanceIds: [s.perm(alias).permanentId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.decisionId !== choice.decisionId);
    }
    expect(s.perm("opponentBase").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("opponentBase"), "cannotActivateWhenDigivolving")).toBe(true);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("opponentBase").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponentBase").topCard?.cardId === "LM-039");
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-009")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponentBase").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-009"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-009")).toBe(false);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-042");
    const compiled = runtimeCompiledCard("LM-042");
    expect(definition?.nameEn).toBe("Rasielmon");
    expect(definition?.colors).toEqual(["Green", "Yellow"]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects[0]).toMatchObject({ keywords: [{ keyword: "SecurityAttack", amount: 1 }] });
  });
});
