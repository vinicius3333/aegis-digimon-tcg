import type { Permanent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { EffectContext } from "./EffectContext.js";
import { SubTriggerRegistry, type SubTriggerTurnLedger } from "./subtriggers.js";

function pendingTarget(permanentId: string): Permanent {
  return { permanentId } as Permanent;
}

function ledgerFor(fired: Set<string>): SubTriggerTurnLedger {
  return {
    hasFired: (key) => fired.has(key),
    markFired: (key) => fired.add(key),
  };
}

describe("SubTriggerRegistry — DigiXros replacement activation budget", () => {
  it("keeps declined OPT available, consumes a successful activation, and still reports the matched source", async () => {
    const registry = new SubTriggerRegistry();
    const fired = new Set<string>();
    const applicableSources: string[] = [];
    const builtContexts: Array<{ sourcePermanentId: string; sourceInstanceId?: string }> = [];
    const appliedContexts: string[] = [];
    let currentPendingId = "pending-a";
    let accept = false;

    registry.subscribeReplacement({
      event: "wouldBePlayed",
      sourcePermanentId: "TAMER-A",
      sourceInstanceId: "TAMER-A-instance",
      mode: "instead",
      oncePerTurnKey: "EX10-064/TAMER-A",
      appliesToPending: (_ctx, target) => target.permanentId.startsWith("pending-"),
      apply: async (ctx) => {
        appliedContexts.push(ctx.trigger?.wouldBePlayedInstanceId ?? "missing");
        return accept;
      },
      description: "DigiXros material-zone expansion",
    });

    const buildContext = (sourcePermanentId: string, sourceInstanceId?: string): EffectContext => {
      builtContexts.push({ sourcePermanentId, sourceInstanceId });
      return { trigger: { wouldBePlayedInstanceId: currentPendingId } } as EffectContext;
    };
    const onApplicable = (replacement: { sourcePermanentId?: string }) => {
      applicableSources.push(replacement.sourcePermanentId ?? "unanchored");
    };
    const turnBudget = ledgerFor(fired);

    // An optional decline is still an offered match, but it must not spend the OPT.
    expect(
      await registry.activateInsteadReplacementsFor(
        "wouldBePlayed",
        pendingTarget("pending-a"),
        buildContext,
        turnBudget,
        onApplicable,
      ),
    ).toBe(0);
    expect(fired).toEqual(new Set());
    expect(appliedContexts).toEqual(["pending-a"]);

    // A later pending play gets a fresh context and can accept the still-unused OPT.
    currentPendingId = "pending-b";
    accept = true;
    expect(
      await registry.activateInsteadReplacementsFor(
        "wouldBePlayed",
        pendingTarget("pending-b"),
        buildContext,
        turnBudget,
        onApplicable,
      ),
    ).toBe(1);
    expect(fired).toEqual(new Set(["EX10-064/TAMER-A"]));
    expect(appliedContexts).toEqual(["pending-a", "pending-b"]);
    expect(builtContexts).toEqual([
      { sourcePermanentId: "TAMER-A", sourceInstanceId: "TAMER-A-instance" },
      { sourcePermanentId: "TAMER-A", sourceInstanceId: "TAMER-A-instance" },
    ]);

    // The source is still applicable for static-fallback exclusion, but the OPT budget blocks
    // another apply call for this turn.
    currentPendingId = "pending-c";
    expect(
      await registry.activateInsteadReplacementsFor(
        "wouldBePlayed",
        pendingTarget("pending-c"),
        buildContext,
        turnBudget,
        onApplicable,
      ),
    ).toBe(0);
    expect(applicableSources).toEqual(["TAMER-A", "TAMER-A", "TAMER-A"]);
    expect(appliedContexts).toEqual(["pending-a", "pending-b"]);
  });

  it("ignores an instead replacement with neither a permanent nor an activation context", async () => {
    const registry = new SubTriggerRegistry();
    let applied = 0;
    let offered = 0;
    let built = 0;

    registry.subscribeReplacement({
      event: "wouldBePlayed",
      mode: "instead",
      appliesToPending: () => true,
      apply: async () => {
        applied += 1;
        return true;
      },
      description: "unanchored replacement",
    });

    expect(
      await registry.activateInsteadReplacementsFor(
        "wouldBePlayed",
        pendingTarget("pending-a"),
        () => {
          built += 1;
          return {} as EffectContext;
        },
        ledgerFor(new Set()),
        () => {
          offered += 1;
        },
      ),
    ).toBe(0);
    expect({ applied, offered, built }).toEqual({ applied: 0, offered: 0, built: 0 });
  });
});
