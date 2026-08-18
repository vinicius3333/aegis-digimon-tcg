import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT7-048 Monochromon", () => {
  it("matches its official effectless metadata and plays without a decision", async () => {
    expect(getCardDefinition("BT7-048")).toMatchObject({
      nameEn: "Monochromon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 8000,
      evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Ankylosaur"],
    });

    const s = setupEngine({ 0: { hand: [{ card: "BT7-048", as: "monochromon" }] } });
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("monochromon").instanceId })).toEqual({ ok: true });
    await s.ready();
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ currentDP: 8000 });
  });
});
