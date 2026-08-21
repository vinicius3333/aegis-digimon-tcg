import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX8-023.js";

describe("EX8-023", () => {
  it("has Ice Clad, trashes 2 digivolution cards, and restricts a card with no digivolution cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({
      keyword: "IceClad",
      raw: "＜Ice Clad＞",
    });
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 2, scope: "acrossDigimon" });
    expect(actions[1]).toMatchObject({ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" });
    expect(actions[2]).toMatchObject({
      kind: "Restrict",
      restriction: "cannotActivateWhenDigivolving",
      target: { sameTarget: true },
    });
  });
  it("trashes two opposing digivolution cards and applies both printed restrictions on play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-023", as: "polar" }] },
      1: { battleArea: [{ card: "EX8-022", as: "opponent", under: ["BT1-009", "BT1-009"] }] },
    }, { autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("polar"));
    expect(s.perm("opponent").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "cannotActivateWhenDigivolving")).toBe(true);
  });

  it("can trash the two cards from different opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-023", as: "polar" }] },
      1: {
        battleArea: [
          { card: "EX8-022", as: "opponent-a", under: ["BT1-009"] },
          { card: "EX8-022", as: "opponent-b", under: ["BT1-009"] },
        ],
      },
    }, { autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("polar"));
    expect(s.perm("opponent-a").stack).toHaveLength(0);
    expect(s.perm("opponent-b").stack).toHaveLength(0);
  });
});
