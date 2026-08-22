import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-039.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-039 KnightChessmon", () => {
  it("keeps the Chessmon evolution requirement and conditional deletion play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toContainEqual(expect.objectContaining({ level: 3, names: ["Chessmon"], cost: 2 }));
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnDeletion", actions: [expect.objectContaining({ kind: "PlayWithoutCost", optional: true, condition: expect.objectContaining({ kind: "isYourTurn" }) })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "Static", isInherited: true, keywords: [expect.objectContaining({ keyword: "Reboot" })] });
  });

  it("plays another level-4 Chessmon from hand after deletion on its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-039", as: "knight" }], hand: ["BT13-039"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("knight").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-039"), 3000);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-039")).toBe(true);
  });
});
