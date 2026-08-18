import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-009.js";
describe("BT12-009 Flamemon", () => { it("trashes a Hybrid from hand and draws 2", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "BT12-009", as: "flame" }], hand: [{ card: "BT12-012", as: "hybrid" }], deck: ["BT1-009", "BT1-010"] } }, { autoAcceptOptional: true, autoSelectCards: true }); await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("flame")); await settle(() => s.state.players[0]!.hand.length === 2); expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("hybrid").instanceId); expect(s.state.players[0]!.hand).toHaveLength(2); }); });
