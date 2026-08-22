import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-033.js";
import "../index.js";
describe("EX11-033 Maneuvermon", () => { it("plays a Maquinamon from hand on play", async () => { const s = setupEngine({ 0: { hand: [{ card: "EX11-033", as: "maneuver" }, { card: "EX11-027", as: "maquina" }] } }, { autoSelectCards: true, autoAcceptOptional: true }); s.state.memory = 10; expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("maneuver").instanceId })).toEqual({ ok: true }); await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX11-027")); expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX11-027")).toBe(true); }); });
