import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-053.js";
import "../index.js";
describe("EX11-053 Omekamon", () => { it("draws after placing a Royal Knight under King Drasil", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "BT23-072", as: "king" }], hand: [{ card: "EX11-053", as: "omeka" }, { card: "AD1-008", as: "royal" }], deck: ["BT1-001"] } }, { autoSelectCards: true, autoAcceptOptional: true }); s.state.memory = 10; expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omeka").instanceId })).toEqual({ ok: true }); await settle(() => s.state.players[0]!.hand.some((c) => c.cardId === "BT1-001")); expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT1-001")).toBe(true); expect(s.perm("king").stack.some((c) => c.cardId === "AD1-008")).toBe(true); }); });
