import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/index.js";
import { compiled } from "./BT18-094.js";

describe("BT18-094 Koichi Kimura", () => {
  it("covers the paid Start Main memory gain and inherited Hybrid recovery", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[1]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          cost: {
            kind: "trash",
            target: { filter: { nameOrTrait: [{ tokens: ["Hybrid", "Ten Warriors"], match: "trait" }] } },
          },
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Return",
          to: "hand",
          optional: true,
          target: { filter: { zone: "trash", nameOrTrait: [{ tokens: ["Hybrid", "Ten Warriors"], match: "trait" }] } },
        },
      ],
    });
  });

  it("plays from Security without cost through the real security timing", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT18-094", as: "koichi", faceUp: true }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("koichi"));
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("koichi").instanceId),
    ).toBe(true);
  });
});
