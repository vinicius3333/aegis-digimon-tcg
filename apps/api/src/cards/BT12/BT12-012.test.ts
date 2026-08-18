import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-012.js";
describe("BT12-012 Agunimon", () => { it("plays Flamemon suspended on deletion", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "BT12-012", as: "aguni" }], hand: [{ card: "BT12-009", as: "flame" }] } }, { autoAcceptOptional: true, autoSelectCards: true }); await advance(s.engine).verb.deletePermanent([s.perm("aguni").permanentId]); await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-009")); const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT12-009"); expect(played?.isSuspended).toBe(true); }); });
