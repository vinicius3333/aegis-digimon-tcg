import { describe, expect, it } from "vitest";
import { EffectTiming, dnaDigivolutionRequirementsFor, digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-037.js";

describe("EX12-037 Omnimon", () => {
  it("maps the evolution routes, keywords, shared timing, deletion, and stack scaling", () => {
    const compiled = registeredCompiledCards.get("EX12-037")!;
    expect(digivolutionRequirementsFor("EX12-037")).toEqual([
      { level: 6, traits: ["ME", "VB"], cost: 5, isAlternate: true },
    ]);
    expect(dnaDigivolutionRequirementsFor("EX12-037")).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Blue", level: 6 },
          { color: "Red", level: 6 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Blue", level: 6 },
          { color: "Black", level: 6 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Yellow", level: 6 },
          { color: "Red", level: 6 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Yellow", level: 6 },
          { color: "Black", level: 6 },
        ],
      },
    ]);
    expect(compiled.effects.filter((effect) => effect.trigger === "Static")).toEqual([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
      { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
      { trigger: "Static", actions: [], keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] },
    ]);
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
          {
            kind: "Modal",
            choose: 0,
            chooseScaling: { per: 5, filter: {}, unit: "digivolutionCards" },
            options: [
              [{ kind: "ModifyDP", amount: -13000, duration: "untilOpponentTurnEnd" }],
              [
                { kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 },
                { kind: "SecurityManipulation", op: "addTop", controller: "mine", from: ["deck"], amount: 1 },
              ],
            ],
          },
        ],
      });
    }
  });

  it("deletes one opponent and applies one scaled DP option for five stack cards", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-037", as: "source", under: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"] },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victim", dp: 3000 },
            { card: "BT1-011", as: "debuffed", dp: 15000 },
          ],
        },
      },
      { autoChooseOption: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("victim").topCard!.instanceId);
    const victimId = s.perm("victim").permanentId;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => false, 100);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId)).toBe(false);
    expect(s.perm("debuffed").currentDP).toBe(2000);
  });

  it("trashes security and recovers when the second option is chosen", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-037", as: "source", under: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"] },
          ],
          deck: ["BT1-014"],
          security: ["BT1-015"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 3000 }], security: ["BT1-016", "BT1-017"] },
      },
      { autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("victim").topCard!.instanceId);
    const victimId = s.perm("victim").permanentId;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => false, 100);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(2);
  });
});
