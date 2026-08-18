import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-011.js";
describe("BT12-011 Shoutmon King Version", () => { it("plays a named Hunter Tamer from hand on play", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "BT12-011", as: "king" }], hand: [{ card: "BT12-087", as: "taiki" }] } }, { autoAcceptOptional: true, autoSelectCards: true }); await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("king")); await settle(() => s.state.players[0]!.battleArea.length === 2); expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT12-087"); }); });
