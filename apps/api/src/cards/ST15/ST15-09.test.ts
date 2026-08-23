import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST15-09 Knightmon", () => {
  it("deletes exactly one opposing Digimon at the cost-5 boundary, not cost 6", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST15-09", as: "knightmon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "cost5" },
            { card: "BT1-010", as: "cost6" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const cost5Id = s.perm("cost5").topCard!.instanceId;
    const cost6Id = s.perm("cost6").topCard!.instanceId;
    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knightmon").instanceId });
    expect(result).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === cost5Id));

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(cost5Id);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === cost6Id)).toBe(true);
  });

  it("does nothing when the opponent has no eligible Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST15-09", as: "knightmon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "cost6" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knightmon").instanceId })).toEqual({
      ok: true,
    });
    await s.ready();
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
