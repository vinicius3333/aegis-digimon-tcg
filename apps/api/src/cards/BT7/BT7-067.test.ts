import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT7-067 Ghostmon", () => {
  it("matches its official effectless metadata and plays without a decision", async () => {
    expect(getCardDefinition("BT7-067")).toMatchObject({
      nameEn: "Ghostmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 5000,
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 1 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Ghost"],
    });

    const s = setupEngine({ 0: { hand: [{ card: "BT7-067", as: "ghostmon" }] } });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ghostmon").instanceId })).toEqual({
      ok: true,
    });
    await s.ready();
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ currentDP: 5000 });
  });
});
