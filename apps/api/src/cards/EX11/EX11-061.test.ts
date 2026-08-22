import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-061.js";
import "../index.js";
describe("EX11-061 Mirai Kinosaki", () => { it("gains memory at start of main when the opponent has a Digimon", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "EX11-061", as: "mirai" }] }, 1: { battleArea: [{ card: "BT1-009", as: "opponent" }] } }); s.state.memory = 0; await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("mirai")); expect(s.state.memory).toBe(1); }); });
