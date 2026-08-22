import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-053.js";

describe("EX11-053 Omekamon", () => {
  it("places a Royal Knight under King Drasil", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT23-072", as: "drasil" },
          hand: [{ card: "EX11-053", as: "omekamon" }, "AD1-008"],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omekamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.stack.some((card) => card.cardId === "AD1-008") === true, 600);
    expect(s.state.players[0]!.breeding?.stack.some((card) => card.cardId === "AD1-008")).toBe(true);
  });
});
