import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-038.js";
import "../index.js";
describe("EX11-038 Sunarizamon", () => { it("trashes a Mineral card to draw one", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "EX11-038", as: "sunari" }], hand: [{ card: "EX11-038", as: "cost" }], deck: ["BT1-001"] } }); await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("sunari")); expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true); }); });
