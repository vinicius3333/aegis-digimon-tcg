import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-045.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-045 KingChessmon", () => {
  it("reduces its play cost at eight Chessmon in trash and deletes another Digimon to play one", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", actions: [expect.objectContaining({ kind: "Replacement", event: "wouldBePlayed" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "PlayWithoutCost", optional: true, abortOnDecline: true, cost: expect.objectContaining({ kind: "deleteOwn" }) })] });
    expect(compiled.effects[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [expect.objectContaining({ kind: "PlayWithoutCost", target: expect.objectContaining({ filter: expect.objectContaining({ excludeNames: ["KingChessmon"] }) }) })] });
  });

  it("deletes another Digimon and plays a Chessmon from hand on play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-035", as: "victim" }], hand: [{ card: "BT13-045", as: "king" }, "BT13-035"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-035"), 3000);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT13-035")).toBe(true);
  });
});
