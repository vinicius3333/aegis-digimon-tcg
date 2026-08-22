import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-031.js";
import "../index.js";
describe("EX11-031 Vespamon", () => { it("suspends an opponent Digimon for each face-up security card", async () => { const s = setupEngine({ 0: { hand: [{ card: "EX11-031", as: "vespa" }], security: [{ card: "BT1-001", faceUp: true }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } }, { autoSelectCards: true }); s.state.memory = 10; expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vespa").instanceId })).toEqual({ ok: true }); await settle(() => s.perm("target").isSuspended); expect(s.perm("target").isSuspended).toBe(true); }); });
