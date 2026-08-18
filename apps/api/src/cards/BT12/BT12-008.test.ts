import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-008.js";
describe("BT12-008 Shoutmon", () => { it("its inherited attack effect deletes a 4000 DP Digimon when the host has Save", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "BT12-011", as: "host", under: ["BT12-008"] }] }, 1: { battleArea: [{ card: "BT12-021", as: "target", dp: 4000 }] } }, { autoSelectCards: true }); await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host")); await settle(() => s.state.players[1]!.battleArea.length === 0); expect(s.state.players[1]!.battleArea).toHaveLength(0); }); });
