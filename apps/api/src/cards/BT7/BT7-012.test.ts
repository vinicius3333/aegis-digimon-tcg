import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT7-012.js";

describe("BT7-012 Brachiomon", () => {
  it("matches its official effectless card metadata", () => {
    expect(getCardDefinition("BT7-012")).toMatchObject({
      nameEn: "Brachiomon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 10000,
      evoCosts: [{ color: "Red", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Plesiosaur"],
    });
  });

  it("plays normally without producing an effect decision", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT7-012", as: "brachiomon" }] } });
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("brachiomon").instanceId })).toEqual({
      ok: true,
    });
    await s.ready();

    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ currentDP: 10000 });
  });
});
