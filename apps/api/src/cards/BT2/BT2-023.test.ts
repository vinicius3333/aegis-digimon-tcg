import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-023.js";

describe("BT2-023 Gomamon", () => {
  it("reduces its play cost for each opposing Digimon without sources", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT2-023", as: "gomamon" }] }, 1: { battleArea: ["BT1-010", "BT1-011"] } });
    await s.ready();
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gomamon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT2-023"));
    expect(s.state.memory).toBe(2);
  });

  it("Q1002 floors the reduced play cost at zero", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT2-023", as: "gomamon" }] },
      1: { battleArea: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"] },
    });
    await s.ready();
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gomamon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT2-023"));
    expect(s.state.memory).toBe(0);
  });
});
