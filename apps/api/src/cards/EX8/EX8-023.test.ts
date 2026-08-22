import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX8-023.js";

describe("EX8-023", () => {
  it("inherits conditional Piercing and Security Attack +1", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [
        { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Piercing" } } },
        { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } } },
      ],
    }));

  it("grants both inherited keywords only while the opponent has no stacked Digimon", async () => {
    const open = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX8-023", as: "polar" }] }] },
      1: { battleArea: [{ card: "BT1-009", as: "empty" }] },
    });
    await open.ready();
    await settle(() => observe(open.engine).hasKeyword(open.perm("host"), "Piercing"));
    expect(observe(open.engine).hasKeyword(open.perm("host"), "Piercing")).toBe(true);
    expect(observe(open.engine).keywordAmount(open.perm("host"), "SecurityAttack")).toBe(1);

    const stacked = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX8-023", as: "polar" }] }] },
      1: { battleArea: [{ card: "BT1-009", as: "stacked", under: ["BT1-009"] }] },
    });
    await stacked.ready();
    expect(observe(stacked.engine).hasKeyword(stacked.perm("host"), "Piercing")).toBe(false);
    expect(observe(stacked.engine).keywordAmount(stacked.perm("host"), "SecurityAttack")).toBe(0);
  });

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
