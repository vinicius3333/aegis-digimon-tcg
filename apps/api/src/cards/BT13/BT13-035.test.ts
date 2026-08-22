import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-035.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-035 PawnChessmon", () => {
  it("plays Chessmon conditionally and raises the level ceiling by two at eight trash cards", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnDeletion", actions: [expect.objectContaining({ kind: "PlayWithoutCost", optional: true, condition: expect.objectContaining({ kind: "isYourTurn" }) }), expect.objectContaining({ kind: "CostModifier", mode: "raiseCeiling", costType: "level", amount: 2, condition: expect.objectContaining({ kind: "youHave", count: 8 }) })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "Static", isInherited: true, keywords: [expect.objectContaining({ keyword: "Reboot" })] });
  });

  it("plays a PawnChessmon from hand when deleted during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-035", as: "pawn" }], hand: ["BT13-035"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("pawn").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-035"), 3000);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-035")).toBe(true);
  });
});
