import { describe, expect, it } from "vitest";
import { Zone } from "@aegis/shared";
import { setupEngine } from "../testkit/harness.js";
import { extractCardAt } from "../state/access.js";
import { applyAssembly, type AssemblyDeps, type AssemblyIntent } from "./assembly.js";
import { defaultPlayCardDeps } from "./playCard.js";
import "../../cards/EX13/EX13-016.js";

// Unit seam for state changes made by an arbitrary optional pre-play cost.
// Real Yuugo/public-intent coverage lives in BT22-094.assembly.test.ts.
describe("#5341 Assembly revalidation after interactive costs", () => {
  it("rejects an unaffordable final cost after a deferred reduction is declined", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX13-016", as: "omni" }],
        trash: ["BT22-013", "BT22-026", "BT22-017", "EX4-038"],
      },
    });
    // Boundary seam: current printed Assembly recipes all cost <= 10 after their
    // recipe discount, so a normal nonnegative Main-phase gauge cannot reach this.
    const deps: AssemblyDeps = {
      maxAffordable: () => 6,
      hasBeforePayCost: () => true,
      minimumDeferredPlayCost: () => 4,
      finalizePlayCost: async (_state, _seat, _instance, _definition, cost) => cost,
      payMemory: () => {
        throw new Error("must not pay");
      },
      nextPermanentId: () => {
        throw new Error("must not place");
      },
      placeUnder: async () => {
        throw new Error("must not move materials");
      },
      fireTiming: async () => {
        throw new Error("must not trigger On Play");
      },
    };
    expect(
      await applyAssembly(
        s.state,
        0,
        {
          type: "playCard",
          instanceId: s.inst("omni").instanceId,
          assembly: { materialInstanceIds: s.state.players[0]!.trash.map((c) => c.instanceId) },
        },
        deps,
      ),
    ).toEqual({ ok: false, reason: "insufficient-memory" });
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(4);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it.each(["hand", "material", "memory"] as const)(
    "rejects a stale %s before memory payment or placement",
    async (change) => {
      const s = setupEngine({
        0: {
          hand: [{ card: "EX13-016", as: "omni" }],
          trash: ["BT22-013", "BT22-026", "BT22-017", "EX4-038"],
        },
      });
      s.state.memory = 10;
      const intent: AssemblyIntent = {
        type: "playCard",
        instanceId: s.inst("omni").instanceId,
        assembly: { materialInstanceIds: s.state.players[0]!.trash.map((c) => c.instanceId) },
      };
      const deps: AssemblyDeps = {
        ...defaultPlayCardDeps,
        finalizePlayCost: async () => {
          if (change === "hand") extractCardAt(s.state.players[0]!, Zone.Hand, 0);
          if (change === "material") extractCardAt(s.state.players[0]!, Zone.Trash, 0);
          if (change === "memory") s.state.memory = -10;
          return 4;
        },
        payMemory: () => {
          throw new Error("must not pay");
        },
        nextPermanentId: () => {
          throw new Error("must not place");
        },
        placeUnder: async () => {
          throw new Error("must not move materials");
        },
        fireTiming: async () => {
          throw new Error("must not trigger On Play");
        },
      };
      expect(await applyAssembly(s.state, 0, intent, deps)).toEqual({
        ok: false,
        reason:
          change === "hand" ? "card-not-in-zone" : change === "material" ? "invalid-material" : "insufficient-memory",
      });
      expect(s.state.players[0]!.battleArea).toHaveLength(0);
    },
  );
});
