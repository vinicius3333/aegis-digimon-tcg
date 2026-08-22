import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST15-04 Solarmon", () => {
  it("adds a revealed black card to hand", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "ST15-04", as: "solarmon" }],
        deck: ["ST15-02"],
      },
    });

    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("solarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "ST15-02"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "ST15-02")).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("trashes a revealed non-black card instead of adding it", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "ST15-04", as: "solarmon" }],
        deck: ["BT1-001"],
      },
    });

    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("solarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
  });

  it("keeps its black level-2 evolution requirement", () => {
    expect(getCardDefinition("ST15-04")?.evoCosts).toEqual([{ color: "Black", level: 2, memoryCost: 0 }]);
  });
});
