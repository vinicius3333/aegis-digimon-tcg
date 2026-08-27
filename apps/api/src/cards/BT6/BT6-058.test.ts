import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-058.js";

describe("BT6-058 Shademon", () => {
  it("plays itself after its security effect", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT6-058", as: "security", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[0]!.battleArea[0]?.topCard?.cardId).toBe("BT6-058");
  });
});
