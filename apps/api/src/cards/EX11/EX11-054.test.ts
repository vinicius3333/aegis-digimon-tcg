import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-054.js";
import "../index.js";
describe("EX11-054 Owen Dreadnought", () => { it("sets memory to 3 at start of turn when memory is 2 or less", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "EX11-054", as: "owen" }] } }); s.state.memory = 2; await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("owen")); expect(s.state.memory).toBe(3); }); });
