import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-042.js";
import "../index.js";
describe("EX11-042 MockingBirdmon", () => { it("plays a Maquinamon from hand on play", async () => { const s = setupEngine({ 0: { hand: [{ card: "EX11-042", as: "mocking" }, { card: "EX11-027", as: "maquina" }] } }, { autoSelectCards: true, autoAcceptOptional: true }); s.state.memory = 10; expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mocking").instanceId })).toEqual({ ok: true }); await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX11-027")); expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX11-027")).toBe(true); }); });
