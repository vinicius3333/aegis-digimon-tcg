import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-065.js";
import "../index.js";
describe("EX11-065 Close", () => { it("trashes a Mineral card and gains memory at start of main", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "EX11-065", as: "close" }], hand: [{ card: "EX11-038", as: "cost" }] } }); s.state.memory = 0; await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("close")); expect(s.state.memory).toBe(1); }); });
