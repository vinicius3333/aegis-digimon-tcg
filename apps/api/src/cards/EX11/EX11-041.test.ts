import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-041.js";
import "../index.js";
describe("EX11-041 Oblivimon", () => { it("flips the opponent's top security card face up on play", async () => { const s = setupEngine({ 0: { hand: [{ card: "EX11-041", as: "oblivimon" }] }, 1: { security: [{ card: "BT1-001", faceUp: false }] } }); s.state.memory = 10; expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("oblivimon").instanceId })).toEqual({ ok: true }); await settle(() => s.state.players[1]!.security[0]!.faceUp === true); expect(s.state.players[1]!.security[0]!.faceUp).toBe(true); }); });
