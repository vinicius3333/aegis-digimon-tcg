import { describe, expect, it } from "vitest";
import { EffectDuration, type Target } from "@aegis/shared";
import { setupEngine } from "../../../testkit/harness.js";
import { internalsOf } from "../../../testkit/internals.js";
import { runAction } from "./runAction.js";
import "../../../../cards/index.js";

describe("optional target preflight", () => {
  it("preserves an optional play activation when no loose card is legal", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST1-03", as: "source" }],
        hand: [{ card: "BT1-009", as: "wrongCard" }],
      },
    });
    await s.ready();
    const engine = internalsOf(s.engine);
    const ctx = engine.buildEffectContext(engine.cardSourceOf(s.perm("source").topCard), {});

    await runAction(ctx, {
      kind: "PlayWithoutCost",
      target: {
        filter: { controller: "mine", nameOrTrait: [{ tokens: ["No Such Card"], match: "nameExact" }] },
        count: 1,
      },
      from: ["hand", "trash"],
      payCost: false,
      optional: true,
      preserveOncePerTurnOnDecline: true,
    });

    expect(s.decisions).toHaveLength(0);
    expect(ctx).toMatchObject({ lastEffectActed: false, oncePerTurnActivationDeclined: true });
  });

  it("preserves an optional play activation when no own-stack card is legal", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST1-03", as: "source", under: ["BT1-009"] }],
      },
    });
    await s.ready();
    const engine = internalsOf(s.engine);
    const ctx = engine.buildEffectContext(engine.cardSourceOf(s.perm("source").topCard), {});

    await runAction(ctx, {
      kind: "PlayWithoutCost",
      target: {
        filter: { nameOrTrait: [{ tokens: ["No Such Card"], match: "nameExact" }] },
        count: 1,
      },
      fromOwnDigivolutionStack: true,
      payCost: false,
      optional: true,
      preserveOncePerTurnOnDecline: true,
    });

    expect(s.decisions).toHaveLength(0);
    expect(ctx).toMatchObject({ lastEffectActed: false, oncePerTurnActivationDeclined: true });
  });

  it("confirms Unsuspend before selecting once from multiple suspended candidates", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST1-03", as: "source" },
            { card: "ST1-03", as: "first", suspended: true },
            { card: "ST1-03", as: "second", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const engine = internalsOf(s.engine);
    const ctx = engine.buildEffectContext(engine.cardSourceOf(s.perm("source").topCard), {});
    await runAction(ctx, {
      kind: "Unsuspend",
      optional: true,
      target: { filter: { controller: "mine", kind: ["Digimon"], suspended: true }, count: 1 },
    });
    expect(s.decisions.map(({ req }) => req.kind)).toEqual(["optional", "chooseTargets"]);
    expect([s.perm("first"), s.perm("second")].filter((p) => !p.isSuspended)).toHaveLength(1);
  });

  it("replaces a successful deletion receipt when the next optional Delete has no target", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST1-03", as: "source" }] }, 1: { battleArea: [{ card: "ST1-03", as: "victim" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const engine = internalsOf(s.engine);
    const ctx = engine.buildEffectContext(engine.cardSourceOf(s.perm("source").topCard), {});
    const target: Target = { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 };
    await runAction(ctx, { kind: "Delete", target });
    expect(ctx.lastDeleteCount).toBe(1);
    const deletedIds = [...(ctx.deletedThisEffectIds ?? [])];
    const decisions = s.decisions.length;
    await runAction(ctx, { kind: "Delete", target, optional: true, trackCount: "latestDeletion" });
    expect(s.decisions).toHaveLength(decisions);
    expect(ctx).toMatchObject({
      lastDeleteCount: 0,
      lastDeleteTargetSelected: false,
      lastDeletedByThisEffectIds: [],
      lastDeletedPermanentSnapshots: [],
      lastEffectActed: false,
    });
    expect(ctx.namedCounts?.get("latestDeletion")).toBe(0);
    expect(ctx.deletedThisEffectIds).toEqual(deletedIds);
    const memory = s.state.memory;
    await runAction(ctx, { kind: "GainMemory", amount: 1, condition: { kind: "ifThisEffectDidNotDelete" } });
    expect(s.state.memory).toBe(memory + 1);
  });

  it("keeps an immune sole Delete target selectable, then leaves it unchanged", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST1-03", as: "source" }] }, 1: { battleArea: [{ card: "ST1-03", as: "immune" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const immune = s.perm("immune");
    internalsOf(s.engine).continuous.addRestriction(immune.permanentId, "beAffected", EffectDuration.Permanent);
    await s.engine.recomputeContinuousEffects();
    const engine = internalsOf(s.engine);
    const ctx = engine.buildEffectContext(engine.cardSourceOf(s.perm("source").topCard), {});
    await runAction(ctx, {
      kind: "Delete",
      optional: true,
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(s.decisions.map(({ req }) => req.kind)).toEqual(["optional"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("keeps an immune sole Unsuspend target selectable, then leaves it suspended", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST1-03", as: "source" }] },
        1: { battleArea: [{ card: "ST1-03", as: "immune", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const immune = s.perm("immune");
    internalsOf(s.engine).continuous.addRestriction(immune.permanentId, "beAffected", EffectDuration.Permanent);
    await s.engine.recomputeContinuousEffects();
    const engine = internalsOf(s.engine);
    const ctx = engine.buildEffectContext(engine.cardSourceOf(s.perm("source").topCard), {});
    await runAction(ctx, {
      kind: "Unsuspend",
      optional: true,
      target: { filter: { controller: "opponent", kind: ["Digimon"], suspended: true }, count: 1 },
    });
    expect(s.decisions.map(({ req }) => req.kind)).toEqual(["optional"]);
    expect(immune.isSuspended).toBe(true);
  });
});
