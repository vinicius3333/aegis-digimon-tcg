import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST8-05.js";

describe("ST8-05 Veedramon", () => {
  it("returns an opposing level 3 and trashes its sources when its host attacks with 8 cards", async () => {
    const s = setupEngine(
      {
        0: { hand: Array(8).fill("ST8-02"), battleArea: [{ card: "ST8-07", as: "host", under: ["ST8-05"] }] },
        1: {
          battleArea: [{ card: "ST8-04", as: "target", under: [{ card: "ST8-01", as: "source" }] }],
          security: ["ST8-01"],
        },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").topCard.instanceId;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetId)).toBe(true);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });
});
