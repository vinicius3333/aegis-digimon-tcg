import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT18-038.js";

describe("BT18-038 ArkhaiAngemon", () => {
  it("gains the Angel trait and resolves its security placement path", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-038", as: "arkhai" }],
          hand: ["BT1-063"],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasEffectiveTrait(s.perm("arkhai"), "Angel")).toBe(true);
    await advance(s.engine).fireForInstance(EffectTiming.OnPlay, s.perm("arkhai").topCard!);

    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT1-063")).toBe(true);
  });
});
