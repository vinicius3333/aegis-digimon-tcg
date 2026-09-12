import { CardInstance, Permanent } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { EffectContext } from "./EffectContext.js";
import { guardLeaveReplacements } from "./guard.js";

// Supplemental asynchronous adapter proof. Public producers/payments are covered by
// keyword-guard-lifecycle.test.ts; these races are not public mutation certificates.
function fixture() {
  const card = new CardInstance();
  card.cardId = "EX13-052";
  card.instanceId = "guard-top";
  const holder = new Permanent();
  holder.permanentId = "guard";
  holder.controllerSeat = 0;
  holder.topCard = card;
  let present = true;
  let hasGuard = true;
  const [reaction] = guardLeaveReplacements([holder.permanentId], {
    idOffset: 2,
    permanentById: () => (present ? holder : undefined),
    isBattleAreaDigimon: (permanent) => permanent !== undefined && !permanent.inBreeding,
    hasGuard: () => hasGuard,
  });
  return {
    holder,
    reaction: reaction!,
    remove: () => {
      present = false;
    },
    loseKeyword: () => {
      hasGuard = false;
    },
  };
}

it.each(["departure", "keyword loss", "top-card change", "controller change", "breeding relocation"])(
  "does not pay a stale Guard after %s during optional processing",
  async (change) => {
    const f = fixture();
    const enter = vi.fn<NonNullable<EffectContext["fx"]["enterEffectResolution"]>>();
    const leave = vi.fn<NonNullable<EffectContext["fx"]["leaveEffectResolution"]>>();
    const pay = vi.fn<EffectContext["fx"]["deletePermanent"]>().mockResolvedValue(1);
    const ask = vi.fn<EffectContext["ask"]["optional"]>(async () => {
      if (change === "departure") f.remove();
      if (change === "keyword loss") f.loseKeyword();
      if (change === "top-card change") {
        const other = new CardInstance();
        other.cardId = "EX13-052";
        other.instanceId = "different-physical-top";
        f.holder.topCard = other;
      }
      if (change === "controller change") f.holder.controllerSeat = 1;
      if (change === "breeding relocation") f.holder.inBreeding = true;
      return true;
    });
    const ctx = {
      ask: { optional: ask },
      fx: { deletePermanent: pay, enterEffectResolution: enter, leaveEffectResolution: leave },
    } as unknown as EffectContext;
    expect(await f.reaction.preventCheck(ctx, "other")).toBe(false);
    expect(ask).toHaveBeenCalledOnce();
    expect(pay).not.toHaveBeenCalled();
    expect(enter).not.toHaveBeenCalled();
    expect(leave).not.toHaveBeenCalled();
  },
);

describe("Guard payment failure", () => {
  it("does not prevent the original leave when self-deletion is prevented", async () => {
    const f = fixture();
    const enter = vi.fn<NonNullable<EffectContext["fx"]["enterEffectResolution"]>>();
    const leave = vi.fn<NonNullable<EffectContext["fx"]["leaveEffectResolution"]>>();
    const pay = vi.fn<EffectContext["fx"]["deletePermanent"]>().mockResolvedValue(0);
    const ctx = {
      ask: { optional: async () => true },
      fx: { deletePermanent: pay, enterEffectResolution: enter, leaveEffectResolution: leave },
    } as unknown as EffectContext;
    expect(await f.reaction.preventCheck(ctx, "other")).toBe(false);
    expect(pay).toHaveBeenCalledWith(["guard"], "byEffect");
    expect(enter).toHaveBeenCalledWith(0, ["Digimon"], "guard");
    expect(leave).toHaveBeenCalledOnce();
  });

  it("restores effect ownership after a rejected payment coroutine", async () => {
    const f = fixture();
    const enter = vi.fn<NonNullable<EffectContext["fx"]["enterEffectResolution"]>>();
    const leave = vi.fn<NonNullable<EffectContext["fx"]["leaveEffectResolution"]>>();
    const failure = new Error("payment failed");
    const pay = vi.fn<EffectContext["fx"]["deletePermanent"]>().mockRejectedValue(failure);
    const ctx = {
      ask: { optional: async () => true },
      fx: { deletePermanent: pay, enterEffectResolution: enter, leaveEffectResolution: leave },
    } as unknown as EffectContext;
    await expect(f.reaction.preventCheck(ctx, "other")).rejects.toBe(failure);
    expect(enter).toHaveBeenCalledWith(0, ["Digimon"], "guard");
    expect(leave).toHaveBeenCalledOnce();
  });
});
