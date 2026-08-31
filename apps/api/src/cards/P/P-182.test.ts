import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-182.js";

describe("P-182 WarGreymon", () => {
  it("encodes MetalGreymon and ADVENTURE alternate digivolution requirements", () => {
    expect(runtimeCompiledCard("P-182")!.digivolutionRequirement).toEqual([
      { level: 5, names: ["MetalGreymon"], cost: 3, isAlternate: true },
      { traits: ["ADVENTURE"], cost: 3, isAlternate: true, level: 5 },
    ]);
  });

  it("encodes Security Attack +1, Blocker, and DP-relative deletion", () => {
    const card = runtimeCompiledCard("P-182")!;
    expect(card.effects.flatMap((effect) => effect.keywords ?? [])).toEqual([
      { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
      { keyword: "Blocker", raw: "＜Blocker＞" },
    ]);
    expect(card.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "Delete",
          target: {
            count: 1,
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
          },
        },
      ],
    });
  });

  it("adds 1000 DP per color among your Digimon and Tamers", () => {
    expect(runtimeCompiledCard("P-182")!.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "permanent",
          scaling: { per: 1, unit: "colors", filter: { controllerDefault: "mine", kind: ["Digimon", "Tamer"] } },
        },
      ],
    });
  });

  it("exposes Security Attack +1 and Blocker on the live WarGreymon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-182", as: "wargrey" }] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("wargrey"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("wargrey"), "Blocker")).toBe(true);
  });

  it("deletes only an opposing Digimon at or below its DP and counts distinct allied colors", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-182", dp: 10000, as: "wargrey" },
            { card: "P-016", as: "purple" },
            { card: "BT1-063", as: "yellow" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 10000, as: "equal" },
            { card: "BT1-009", dp: 11000, as: "over" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("wargrey"));
    await settle();
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("equal").instanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("over").instanceId)).toBe(true);
    expect(s.perm("wargrey").currentDP).toBe(13000);
  });
});
