import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT7-050 Triceramon", () => {
  it("matches its official effectless metadata and plays without a decision", async () => {
    expect(getCardDefinition("BT7-050")).toMatchObject({
      nameEn: "Triceramon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 6,
      dp: 7000,
      evoCosts: [{ color: "Green", level: 4, memoryCost: 2 }],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Ceratopsian"],
    });

    const s = setupEngine({ 0: { hand: [{ card: "BT7-050", as: "triceramon" }] } });
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("triceramon").instanceId })).toEqual({
      ok: true,
    });
    await s.ready();
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ currentDP: 7000 });
  });
});
