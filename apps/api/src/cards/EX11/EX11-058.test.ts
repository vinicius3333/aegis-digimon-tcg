import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-058.js";
import "../index.js";
describe("EX11-058 Yao Qinglan", () => { it("places an Aqua card under a matching Digimon and gains memory", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "EX11-018", as: "host" }, { card: "EX11-058", as: "yao" }], hand: [{ card: "EX11-018", as: "aqua" }] } }); s.state.memory = 0; await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("yao")); expect(s.state.memory).toBe(1); expect(s.perm("host").stack.some((c) => c.cardId === "EX11-018")).toBe(true); }); });
