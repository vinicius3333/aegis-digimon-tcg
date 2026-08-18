import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-006.js";

describe("BT9-006 Pagumon", () => {
  it("may trash any hand card when attacking to give its host +1000 DP", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT1-028", as: "host", under: ["BT9-006"] }],
      hand: [{ card: "BT1-089", as: "cost" }],
    } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("host").currentDP).toBe(4000);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
  });
});
