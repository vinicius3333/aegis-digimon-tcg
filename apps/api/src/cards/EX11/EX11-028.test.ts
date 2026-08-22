import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-028.js";
import "../index.js";

describe("EX11-028 Galemon", () => {
  it("plays Shoto Kazama when one of your Digimon suspends", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "target" }], hand: [{ card: "EX11-028", as: "galemon" }, { card: "EX11-062", as: "shoto" }] } }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("galemon").instanceId })).toEqual({ ok: true });
    await advance(s.engine).fireSubTrigger("whenSuspended", { suspendedPermanentId: s.perm("target").permanentId, subjectPermanentIds: [s.perm("target").permanentId] });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX11-062"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX11-062")).toBe(true);
  });
});
