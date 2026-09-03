import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-012.js";

describe("EX1-012 Gomamon", () => {
  it("trashes the bottom digivolution card of an opposing Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX1-012", as: "gomamon" }] },
        1: {
          battleArea: [
            {
              card: "BT1-032",
              as: "target",
              under: [
                { card: "BT1-029", as: "bottom" },
                { card: "BT1-030", as: "topSource" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const bottomId = s.inst("bottom").instanceId;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gomamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === bottomId));
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.perm("target").stack[0]!.instanceId).toBe(s.inst("topSource").instanceId);
  });

  it("does not select an opposing Digimon with no digivolution cards", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX1-012", as: "gomamon" }] }, 1: { battleArea: [{ card: "BT1-030", as: "target" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gomamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX1-012"));
    expect(s.perm("target").stack).toHaveLength(0);
  });

  it("does not target a stacked Digimon in the breeding area", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX1-012", as: "gomamon" }] },
        1: { breeding: { card: "BT1-032", as: "raised", under: ["BT1-030"] } },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gomamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX1-012"));
    expect(s.perm("raised").stack).toHaveLength(1);
  });
});
