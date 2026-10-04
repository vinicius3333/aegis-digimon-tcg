import { describe, expect, it } from "vitest";
import { EffectDuration, type Cost } from "@aegis/shared";
import { setupEngine } from "../../../testkit/harness.js";
import { internalsOf } from "../../../testkit/internals.js";
import { buildEffectContext, cardSourceOf } from "../../../gameEngine/effectContext.js";
import { canPayCost } from "./canPay.js";
import { paySuspendCost } from "./permanents.js";
import "../../../../cards/BT1/index.js";

async function restrictedSource() {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT1-010", as: "source" },
          { card: "BT1-011", as: "eligible" },
        ],
        deck: ["BT1-012"],
      },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  internalsOf(s.engine).continuous.addRestriction(s.perm("source").permanentId, "suspend", EffectDuration.Permanent);
  const source = cardSourceOf(s.engine as never, s.perm("source").topCard);
  const ctx = buildEffectContext(s.engine as never, source, { effectKey: "test" } as never, {} as never);
  return { s, ctx };
}

async function linkedOptionSource(immunity: string) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT1-010", as: "host", linked: [{ card: "BT25-100", as: "linked-option" }] }],
        deck: ["BT1-012"],
      },
      1: { battleArea: [{ card: "BT1-011", as: "protected" }], deck: ["BT1-012"] },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  internalsOf(s.engine).continuous.addRestriction(
    s.perm("protected").permanentId,
    "beAffected",
    EffectDuration.Permanent,
    { byOpponentEffectsOnly: true, fromSourceKind: [immunity] },
  );
  const source = cardSourceOf(s.engine as never, s.inst("linked-option"));
  const ctx = buildEffectContext(s.engine as never, source, { effectKey: "test" } as never, {} as never);
  ctx.effectSourceKinds = ["Digimon"];
  return { s, ctx };
}

describe("suspension cost restrictions", () => {
  it.each(["Option", "Digimon"])("classifies a linked Option cost as Digimon against %s immunity", async (immunity) => {
    const { s, ctx } = await linkedOptionSource(immunity);
    const cost: Cost = { kind: "suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } };
    expect(canPayCost(ctx, cost)).toBe(immunity === "Option");
    expect(await paySuspendCost(ctx, cost)).toBe(immunity === "Option");
    expect(s.perm("protected").isSuspended).toBe(immunity === "Option");
  });

  it("preserves the linked resolution frame when a mutation carries its physical Option card ID", async () => {
    const { s, ctx } = await linkedOptionSource("Option");
    ctx.fx.enterEffectResolution!(0, ["Digimon"]);
    try {
      expect(
        await ctx.fx.suspend([s.perm("protected").permanentId], { byEffectSeat: 0, byEffectCardId: "BT25-100" }),
      ).toEqual([s.perm("protected").permanentId]);
      expect(s.perm("protected").isSuspended).toBe(true);
    } finally {
      ctx.fx.leaveEffectResolution!();
    }
  });

  it("refuses the source cost at preview and payment without changing state", async () => {
    const { s, ctx } = await restrictedSource();
    const cost: Cost = { kind: "suspend" };
    expect(canPayCost(ctx, cost)).toBe(false);
    expect(await paySuspendCost(ctx, cost)).toBe(false);
    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.perm("eligible").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("excludes the restricted permanent and suspends the legal target", async () => {
    const { s, ctx } = await restrictedSource();
    const cost: Cost = { kind: "suspend", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } };
    expect(canPayCost(ctx, cost)).toBe(true);
    expect(await paySuspendCost(ctx, cost)).toBe(true);
    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.perm("eligible").isSuspended).toBe(true);
    expect(ctx.lastSuspendedPermanentIds).toEqual([s.perm("eligible").permanentId]);
  });

  it("cannot count an unsuspendable target toward a fixed two-permanent cost", async () => {
    const { s, ctx } = await restrictedSource();
    const cost: Cost = { kind: "suspend", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 } };
    expect(canPayCost(ctx, cost)).toBe(false);
    expect(await paySuspendCost(ctx, cost)).toBe(false);
    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.perm("eligible").isSuspended).toBe(false);
  });

  it("keeps the default activation-cost breeding refusal with an explicit interpreter opt-in", async () => {
    const s = setupEngine({ 0: { breeding: { card: "BT1-010", as: "source" }, deck: ["BT1-012"] } });
    await s.ready();
    const source = cardSourceOf(s.engine as never, s.perm("source").topCard);
    const ctx = buildEffectContext(s.engine as never, source, { effectKey: "test" } as never, {} as never);
    expect(ctx.fx.canPayActivationCost!(s.perm("source").permanentId, "suspend")).toBe(false);
    expect(canPayCost(ctx, { kind: "suspend" })).toBe(true);
    expect(await paySuspendCost(ctx, { kind: "suspend" })).toBe(true);
    expect(s.perm("source").isSuspended).toBe(true);
  });

  it("uses the source's owner on the opponent turn and respects source-kind-qualified immunity", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-010", as: "source" }], deck: ["BT1-012"] } });
    await s.ready();
    s.state.turnSeat = 1;
    const permanent = s.perm("source");
    internalsOf(s.engine).continuous.addRestriction(permanent.permanentId, "beAffected", EffectDuration.Permanent, {
      byOpponentEffectsOnly: true,
    });
    internalsOf(s.engine).continuous.addRestriction(permanent.permanentId, "beAffected", EffectDuration.Permanent, {
      fromSourceKind: ["Option"],
    });
    const source = cardSourceOf(s.engine as never, permanent.topCard);
    const ctx = buildEffectContext(s.engine as never, source, { effectKey: "test" } as never, {} as never);
    expect(ctx.fx.canSuspend!(permanent.permanentId, { byEffectSeat: 0, effectSourceKinds: ["Option"] })).toBe(false);
    expect(await ctx.fx.suspend([permanent.permanentId], { byEffectSeat: 0, effectSourceKinds: ["Option"] })).toEqual(
      [],
    );
    expect(permanent.isSuspended).toBe(false);
    expect(canPayCost(ctx, { kind: "suspend" })).toBe(true);
    expect(await paySuspendCost(ctx, { kind: "suspend" })).toBe(true);
    expect(permanent.isSuspended).toBe(true);
  });
});
