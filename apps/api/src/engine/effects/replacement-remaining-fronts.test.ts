import { describe, expect, it } from "vitest";
import { CardInstance, Permanent as PermanentClass } from "@aegis/shared";
import type { Permanent, Seat } from "@aegis/shared";
import { consultLeavePrevention, type LeavePreventionHost } from "./leavePrevention.js";
import { createCardSource } from "../cards/CardSource.js";
import { SubTriggerRegistry } from "./subtriggers.js";

/** Synthetic witnesses for current provider intersections; no production card is inferred. */
function perm(id: string, seat: Seat): Permanent {
  const top = new CardInstance();
  top.instanceId = `${id}-top`;
  top.cardId = "AD1-001";
  top.ownerSeat = seat;
  top.faceUp = true;
  const result = new PermanentClass();
  result.permanentId = id;
  result.controllerSeat = seat;
  result.topCard = top;
  result.isSuspended = false;
  result.baseDP = 5000;
  result.currentDP = 5000;
  return result;
}

function host(
  state: Map<string, Permanent>,
  registry: SubTriggerRegistry,
  orderIds: number[] = [],
): LeavePreventionHost {
  return {
    subTriggers: registry,
    permanentById: (id) => state.get(id),
    buildContext: (source, leavingId) =>
      ({
        source: createCardSource(source.topCard, {
          permanentOf: () => source,
          isOnBattleArea: () => true,
          isSeatsTurn: (seat) => seat === 0,
        }),
        game: { permanentById: (id: string) => state.get(id) } as never,
        trigger: { deletedPermanentId: leavingId },
      }) as never,
    turnSeat: 0,
    orderReplacements: async (replacements) => {
      const rank = new Map(orderIds.map((id, index) => [id, index]));
      return [...replacements].sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99));
    },
  };
}

describe("remaining replacement fronts", () => {
  it("orders a three-provider group and charges one affectsAll payment for all targets", async () => {
    const state = new Map<string, Permanent>(
      ["a", "b", "c", "victim-a", "victim-b", "victim-c"].map((id, i) => [id, perm(id, i < 3 ? 0 : 1)]),
    );
    const registry = new SubTriggerRegistry();
    const payments: string[] = [];
    for (const source of ["a", "b", "c"]) {
      registry.subscribeReplacement({
        event: "wouldLeavePlay",
        mode: "prevent",
        sourcePermanentId: source,
        activationIdentity: `group/${source}`,
        description: "synthetic group provider",
        protects: () => true,
        preventCheck: async () => {
          payments.push(source);
          return true;
        },
      });
    }
    const replacements = registry.replacementsFor("wouldLeavePlay");
    const prevented = await consultLeavePrevention(
      host(state, registry, [replacements[2]!.id, replacements[0]!.id, replacements[1]!.id]),
      ["victim-a", "victim-b", "victim-c"],
      "byEffect",
      1,
      { reentryGuard: { activeReplacementKeys: new Set() } },
    );
    expect(payments).toEqual(["c", "a", "b", "c", "a", "b", "c", "a", "b"]);
    const allRegistry = new SubTriggerRegistry();
    allRegistry.subscribeReplacement({
      event: "wouldLeavePlay",
      mode: "prevent",
      sourcePermanentId: "c",
      activationIdentity: "all/c",
      description: "synthetic all provider",
      affectsAll: true,
      protects: () => true,
      preventCheck: async () => {
        payments.push("c");
        return true;
      },
    });
    const all = allRegistry
      .replacementsFor("wouldLeavePlay")
      .find((replacement) => replacement.sourcePermanentId === "c")!;
    payments.length = 0;
    const allPrevented = await consultLeavePrevention(
      host(state, allRegistry, [all.id]),
      ["victim-a", "victim-b", "victim-c"],
      "byEffect",
      1,
      { reentryGuard: { activeReplacementKeys: new Set() } },
    );
    expect(prevented).toEqual(new Set(["victim-a", "victim-b", "victim-c"]));
    expect(allPrevented).toEqual(new Set(["victim-a", "victim-b", "victim-c"]));
    expect(payments).toEqual(["c"]);
  });

  it("drops a synthetic inherited provider after its physical source departs", async () => {
    const source = perm("source", 0);
    const inherited = new CardInstance();
    inherited.instanceId = "copied-source";
    inherited.cardId = "AD1-001";
    inherited.ownerSeat = 0;
    inherited.faceUp = true;
    source.stack.push(inherited);
    const state = new Map<string, Permanent>([
      ["source", source],
      ["victim", perm("victim", 1)],
    ]);
    const registry = new SubTriggerRegistry();
    let sibling = 0;
    registry.subscribeReplacement({
      event: "wouldLeavePlay",
      mode: "instead",
      sourcePermanentId: "source",
      sourceInstanceId: source.topCard!.instanceId,
      activationIdentity: "copy/first",
      description: "depart source",
      appliesTo: () => true,
      apply: async () => {
        source.stack.length = 0;
        return false;
      },
    });
    registry.subscribeReplacement({
      event: "wouldLeavePlay",
      mode: "instead",
      sourcePermanentId: "source",
      sourceInstanceId: inherited.instanceId,
      activationIdentity: "copy/sibling",
      description: "copied sibling",
      appliesTo: () => true,
      apply: async () => {
        sibling++;
      },
    });
    await consultLeavePrevention(host(state, registry), ["victim"], "byEffect", 1, {
      reentryGuard: { activeReplacementKeys: new Set() },
    });
    expect(sibling).toBe(0);
  });

  it("retains a physical top provider after controller turnover and invalidates top replacement", async () => {
    const source = perm("source", 0);
    const state = new Map<string, Permanent>([
      ["source", source],
      ["victim", perm("victim", 1)],
    ]);
    const registry = new SubTriggerRegistry();
    let activated = 0;
    registry.subscribeReplacement({
      event: "wouldLeavePlay",
      mode: "instead",
      sourcePermanentId: "source",
      sourceInstanceId: source.topCard!.instanceId,
      activationIdentity: "turn/first",
      description: "controller turnover",
      appliesTo: () => true,
      apply: async () => {
        source.controllerSeat = 1;
        return false;
      },
    });
    registry.subscribeReplacement({
      event: "wouldLeavePlay",
      mode: "instead",
      sourcePermanentId: "source",
      sourceInstanceId: source.topCard!.instanceId,
      activationIdentity: "turn/sibling",
      description: "stale copied provider",
      appliesTo: () => true,
      apply: async () => {
        activated++;
      },
    });
    await consultLeavePrevention(host(state, registry), ["victim"], "byEffect", 1, {
      reentryGuard: { activeReplacementKeys: new Set() },
    });
    expect(activated).toBe(1);
    const replacementTop = new CardInstance();
    replacementTop.instanceId = "new-top";
    replacementTop.cardId = "AD1-001";
    replacementTop.ownerSeat = 0;
    replacementTop.faceUp = true;
    source.topCard = replacementTop;
    activated = 0;
    await consultLeavePrevention(host(state, registry), ["victim"], "byEffect", 1, {
      reentryGuard: { activeReplacementKeys: new Set() },
    });
    expect(activated).toBe(0);
  });

  it("permits nested movement while the active payment provider cannot re-enter itself", async () => {
    const state = new Map<string, Permanent>([
      ["source", perm("source", 0)],
      ["nested", perm("nested", 0)],
      ["moved", perm("moved", 0)],
      ["outer", perm("outer", 1)],
      ["inner", perm("inner", 1)],
    ]);
    const registry = new SubTriggerRegistry();
    const guard = { activeReplacementKeys: new Set<string>() };
    let payments = 0;
    let nestedPayments = 0;
    registry.subscribeReplacement({
      event: "wouldLeavePlay",
      mode: "prevent",
      sourcePermanentId: "source",
      activationIdentity: "nested/payment",
      description: "nested movement payment",
      protects: (_ctx, id) => id === "outer" || id === "inner",
      preventCheck: async () => {
        payments++;
        if (payments > 1) throw new Error("active payment re-entered");
        state.delete("moved");
        await consultLeavePrevention(host(state, registry), ["inner"], "byEffect", 1, { reentryGuard: guard });
        return true;
      },
    });
    registry.subscribeReplacement({
      event: "wouldLeavePlay",
      mode: "prevent",
      sourcePermanentId: "nested",
      activationIdentity: "nested/sibling",
      description: "nested provider",
      protects: (_ctx, id) => id === "inner",
      preventCheck: async () => {
        nestedPayments++;
        return true;
      },
    });
    const prevented = await consultLeavePrevention(host(state, registry), ["outer"], "byEffect", 1, {
      reentryGuard: guard,
    });
    expect(payments).toBe(1);
    expect(nestedPayments).toBe(1);
    expect(state.has("moved")).toBe(false);
    expect(prevented).toEqual(new Set(["outer"]));
  });
});
