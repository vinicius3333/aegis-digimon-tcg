import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-056.js";
import "../index.js";

describe("EX7-056", () => {
  it("has Blocker and on deletion trashes a card to delete opposing level 3 and level 4 Digimon", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions).toMatchObject([
      { kind: "Trash" },
      { kind: "Delete", target: { filter: { levels: [3] } } },
      { kind: "Delete", target: { filter: { levels: [4] } } },
    ]);
  });
  it("inherits Retaliation", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Retaliation",
      raw: "＜Retaliation＞",
    }));

  it("publicly trashes a hand card on deletion and deletes opposing level 3 and level 4 Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-056", as: "oro" }], hand: ["BT1-001"] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3" },
            { card: "BT1-014", as: "level4" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("oro"), "Blocker")).toBe(true);
    await advance(s.engine).fire(EffectTiming.OnDestroyedAnyone, s.perm("oro"));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("respects an opposing Tortomon's effect-deletion protection", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-056", as: "oro" }], hand: ["BT1-001"] },
        1: { battleArea: ["BT1-009", { card: "EX7-041", as: "protected" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnDestroyedAnyone, s.perm("oro"));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["EX7-041"]);
  });

  it("exposes Blocker and inherited Retaliation through an evolution stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX7-056", as: "blocker" },
          { card: "BT1-009", as: "host", under: ["EX7-056"] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("blocker"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
  });
});
