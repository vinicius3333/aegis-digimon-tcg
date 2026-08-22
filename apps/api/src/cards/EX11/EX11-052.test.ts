import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-052.js";
import "../index.js";
describe("EX11-052 HeavyMetaldramon", () => { it("trashes two hand cards and deletes an unsuspended opponent Digimon on play", async () => { const s = setupEngine({ 0: { hand: [{ card: "EX11-052", as: "heavy" }, "BT1-001", "BT1-002"] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } }, { autoSelectCards: true, autoAcceptOptional: true }); s.state.memory = 10; expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("heavy").instanceId })).toEqual({ ok: true }); await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("target").permanentId)); expect(s.state.players[0]!.hand).toHaveLength(0); }); });
