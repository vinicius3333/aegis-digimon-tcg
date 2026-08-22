import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-021.js";
import "../index.js";
describe("EX11-021 Kokeshimon", () => { it("plays Mirai Kinosaki after digivolving with one or fewer Tamers", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "EX11-019", as: "base" }], hand: [{ card: "EX11-021", as: "evolution" }, { card: "EX11-061", as: "mirai" }] } }, { autoSelectCards: true, autoAcceptOptional: true }); s.state.memory = 10; expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolution").instanceId })).toEqual({ ok: true }); await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX11-061")); expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX11-061")).toBe(true); }); });
