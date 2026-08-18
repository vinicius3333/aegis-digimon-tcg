import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-009.js";

describe("BT11-009 Shoutmon + StarSword", () => {
  it("DigiXroses with Shoutmon and Starmons, applies -3000, then deletes a 2000 DP Digimon", async () => {
    const s = setupEngine({
      0: { hand: [
        { card: "BT11-009", as: "source" },
        { card: "BT10-008", as: "shoutmon" },
        { card: "BT10-029", as: "starmons" },
      ] },
      1: { battleArea: [
        { card: "BT1-009", as: "dpTarget", dp: 6000 },
        { card: "BT1-010", as: "deleteTarget", dp: 2000 },
      ] },
    }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 6;
    const deleteTargetCardId = s.perm("deleteTarget").topCard.instanceId;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("source").instanceId,
      digiXros: { materialInstanceIds: [s.inst("shoutmon").instanceId, s.inst("starmons").instanceId] },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === deleteTargetCardId));

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT11-009")!;
    expect(played.stack).toHaveLength(2);
    expect(observe(s.engine).keywordAmount(played, "MaterialSave")).toBe(1);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === deleteTargetCardId)).toBe(true);
  });
});
