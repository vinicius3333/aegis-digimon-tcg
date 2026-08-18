import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-010.js";
describe("BT12-010 Growlmon", () => { it("plays Takato from hand for free when none is in play", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "BT12-010", as: "growl" }], hand: [{ card: "BT12-089", as: "takato" }] } }, { autoAcceptOptional: true, autoSelectCards: true }); await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("growl")); await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-089")); expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT12-089"); }); });
