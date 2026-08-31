import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-042.js";

describe("LM-042 Rasielmon", () => {
  it("suspends one opposing permanent and locks one from unsuspending or digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-042", as: "rasielmon" }] },
        1: { battleArea: [{ card: "BT1-055", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("rasielmon"));
    await settle(() => s.perm("opponent").isSuspended, 2000);

    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "cannotActivateWhenDigivolving")).toBe(true);
  });

  it("puts both halves of the lock on the same chosen permanent", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-042", as: "rasielmon" }] },
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

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("rasielmon"));
    await settle(() => observe(s.engine).isRestricted(s.perm("second"), "unsuspend"), 2000);

    expect(observe(s.engine).isRestricted(s.perm("second"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("second"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("first"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("first"), "cannotActivateWhenDigivolving")).toBe(false);
  });

  it("lets the Then lock choose a different opponent permanent than the suspension", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-042", as: "rasielmon" }] },
        1: {
          battleArea: [
            { card: "BT1-055", as: "suspendedTarget" },
            { card: "BT1-056", as: "lockedTarget" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    await s.ready();

    const resolving = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("rasielmon"));
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
    await resolving;

    expect(s.perm("suspendedTarget").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("suspendedTarget"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("lockedTarget"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("lockedTarget"), "cannotActivateWhenDigivolving")).toBe(true);
  });

  it("places itself as the bottom security card when deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-042", as: "rasielmon" }], security: [{ card: "BT1-009" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("rasielmon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.security.length === 2, 2000);

    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009", "LM-042"]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "LM-042")).toBe(false);
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
