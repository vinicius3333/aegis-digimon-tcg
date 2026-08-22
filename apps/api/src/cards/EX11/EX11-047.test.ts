import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-047.js";
import "../index.js";
describe("EX11-047 Impmon", () => { it("trashes a hand card and gains memory at start of main", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "EX11-047", as: "impmon" }], hand: ["BT1-001"] } }); s.state.memory = 0; await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("impmon")); expect(s.state.memory).toBe(1); expect(s.state.players[0]!.hand).toHaveLength(0); }); });
