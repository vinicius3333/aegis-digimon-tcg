import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT7-041.js";

describe("BT7-041 Kazuchimon", () => {
  it("recovers to 3 security without also gaining memory, then gains Security Attack +1", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT7-041", as: "kazuchi" }], security: 2, deck: ["BT1-010"] } });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("kazuchi"));

    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("kazuchi"), "SecurityAttack")).toBe(1);
  });
});
