import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-076.js";
import "../index.js";
describe("BT21-076 WarGrowlmon", () => {
  it("mills two, grants keywords, and offers once-per-turn evolution", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenAttacking",
        frequency: "OncePerTurn",
        actions: expect.arrayContaining([
          expect.objectContaining({ kind: "Digivolve" }),
          expect.objectContaining({
            kind: "Replacement",
            mode: "reduceCost",
            scaling: { per: 10, unit: "cards", filter: { zone: "trash", controller: "both" } },
          }),
        ]),
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDeletion",
        isInherited: true,
        actions: [
          expect.objectContaining({
            kind: "SecurityManipulation",
            op: "trashTop",
            controller: "opponent",
            amount: 1,
          }),
        ],
      }),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("trashes two cards and gains Raid and Retaliation on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT21-076", as: "wargrowlmon" }], deck: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wargrowlmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 2);

    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(observe(s.engine).hasKeyword(s.perm("wargrowlmon"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("wargrowlmon"), "Retaliation")).toBe(true);
  });
});
