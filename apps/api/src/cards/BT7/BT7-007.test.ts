import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT7-007.js";

describe("BT7-007 ToyAgumon", () => {
  it("matches its official effectless card metadata", () => {
    expect(getCardDefinition("BT7-007")).toMatchObject({
      nameEn: "ToyAgumon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 2,
      dp: 3000,
      evoCosts: [{ color: "Red", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Puppet"],
    });
  });

  it("plays as a normal 3000 DP Digimon without producing an effect decision", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT7-007", as: "toyAgumon" }] } });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("toyAgumon").instanceId })).toEqual({
      ok: true,
    });
    await s.ready();

    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ currentDP: 3000 });
  });
});
