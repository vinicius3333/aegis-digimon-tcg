import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
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

  it("publicly digivolves from catalog MetalGreymon, pays 3, and deletes at the DP boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-021", as: "base" },
            { card: "P-016", as: "purple" },
            { card: "BT1-063", as: "yellow" },
          ],
          hand: [{ card: "P-182", as: "wargrey" }, "BT1-013"],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: ["BT1-009", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 15000, as: "equal" },
            { card: "BT1-009", dp: 16000, as: "over" },
          ],
          hand: ["BT1-013"],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: ["BT1-009", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const originalSourceId = s.perm("base").topCard.instanceId;
    const equalId = s.perm("equal").permanentId;
    const overId = s.perm("over").permanentId;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wargrey").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === equalId));
    expect(s.state.memory).toBe(7);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([originalSourceId]);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("wargrey").instanceId);
    expect(s.perm("base").currentDP).toBe(15000);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === overId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });
});
