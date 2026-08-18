import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-095.js";

describe("BT9-095 Gaia Force ZERO — Security", () => {
  it("deletes any opposing Digimon without the main effect's 13000-DP cap", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT9-095", as: "option", faceUp: true }] }, 1: { battleArea: [{ card: "BT2-083", as: "target" }] } }, { autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
