import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-072.js";
import "../index.js";
describe("EX11-072 Unique Emblem: Guardian Vortex", () => { it("plays Pteromon and places itself in the battle area", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "EX11-026", as: "anchor" }], hand: [{ card: "EX11-072", as: "emblem" }, { card: "EX11-026", as: "pteromon" }] } }, { autoSelectCards: true, autoAcceptOptional: true }); s.state.memory = 10; expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("emblem").instanceId })).toEqual({ ok: true }); await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX11-026")); expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX11-026")).toBe(true); expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX11-072")).toBe(true); }); });
