import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-027.js";
import "../index.js";
describe("EX11-027 Maquinamon", () => { it("reveals three and adds two Maquinamon-text cards", async () => { const s = setupEngine({ 0: { hand: [{ card: "EX11-027", as: "maquina" }], deck: ["EX11-027", "EX11-029", "BT1-001"] } }, { autoSelectCards: true }); s.state.memory = 10; expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("maquina").instanceId })).toEqual({ ok: true }); await settle(() => s.state.players[0]!.hand.some((c) => c.cardId === "EX11-029")); expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual(expect.arrayContaining(["EX11-027", "EX11-029"])); }); });
