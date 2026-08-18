import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-080.js";

describe("P-080 Labramon", () => {
  it("deletes only an opponent level 3 Digimon with a purple Tamer", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-080", as: "source" }], battleArea: [{ card: "BT4-097", as: "tamer" }] },
        1: { battleArea: [{ card: "BT1-009", as: "level-3" }, { card: "BT1-012", as: "level-4" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const level3Id = s.perm("level-3").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === level3Id));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === level3Id)).toBe(false);
    expect(s.perm("level-4").topCard?.cardId).toBe("BT1-012");
  });

  it("does not delete without a purple Tamer", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "P-080", as: "source" }], battleArea: [{ card: "BT1-085", as: "red-tamer" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 10;
    const targetId = s.perm("target").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(true);
  });
});
