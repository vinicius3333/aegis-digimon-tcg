import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT12-013.js";
describe("BT12-013 BurningGreymon", () => { it("gets +2000 DP when digivolving", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "BT12-013", as: "burning" }] } }); const before = s.perm("burning").currentDP; await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("burning")); expect(s.perm("burning").currentDP).toBe(before + 2000); }); });
