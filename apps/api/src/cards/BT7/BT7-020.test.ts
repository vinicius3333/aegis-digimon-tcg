import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT7-020 Shellmon", () => {
  it("matches its official effectless card metadata", () => {
    expect(getCardDefinition("BT7-020")).toMatchObject({
      nameEn: "Shellmon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 6000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Mollusk"],
    });
  });

  it("plays normally without producing an effect decision", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT7-020", as: "shellmon" }] } });
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shellmon").instanceId })).toEqual({ ok: true });
    await s.ready();

    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ currentDP: 6000 });
  });
});
