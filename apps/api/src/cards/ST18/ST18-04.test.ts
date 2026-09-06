import type { PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST18-04 Pteromon", () => {
  it("applies the inherited Your Turn DP bonus through a real evolution stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST18-09", dp: 7000, as: "host", under: ["ST18-04"] }] },
    });
    await s.ready();
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["ST18-04"]);
    expect(s.perm("host").currentDP).toBe(9000);
  });

  it("reveals three, adds one Bird/Avian and one Vortex Warriors/LIBERATOR card, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST18-04", as: "pteromon" }],
          deck: [{ card: "ST18-03" }, { card: "ST18-08" }, { card: "BT1-009" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    const p0 = s.state.players[0] as PlayerState;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pteromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.hand.some((card) => card.cardId === "ST18-03"));

    expect(p0.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["ST18-03", "ST18-08"]));
    expect(p0.deck.map((card) => card.cardId)).toContain("BT1-009");
    expect(p0.deck.map((card) => card.cardId)).not.toEqual(expect.arrayContaining(["ST18-03", "ST18-08"]));
  });

  it("adds the available matching card when the other search category is absent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST18-04", as: "pteromon" }],
          deck: [{ card: "ST18-03" }, { card: "BT1-009" }, { card: "BT1-010" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const p0 = s.state.players[0] as PlayerState;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pteromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.hand.some((card) => card.cardId === "ST18-03"));
    expect(p0.hand.map((card) => card.cardId)).toContain("ST18-03");
    expect(p0.deck.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-009", "BT1-010"]));
  });

  it("does not apply the inherited bonus during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST18-09", dp: 7000, as: "host", under: ["ST18-04"] }] } });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(7000);
  });
});
