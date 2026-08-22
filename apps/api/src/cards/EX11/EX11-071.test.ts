import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-071.js";
import "../index.js";
describe("EX11-071 Cool Boy", () => { it("reveals three and adds Omekamon and a LIBERATOR card", async () => { const s = setupEngine({ 0: { hand: [{ card: "EX11-071", as: "cool" }], deck: ["EX11-053", "EX11-055", "BT1-001"] } }, { autoSelectCards: true }); s.state.memory = 10; expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cool").instanceId })).toEqual({ ok: true }); await settle(() => s.state.players[0]!.hand.some((c) => c.cardId === "EX11-053")); expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual(expect.arrayContaining(["EX11-053", "EX11-055"])); }); });
