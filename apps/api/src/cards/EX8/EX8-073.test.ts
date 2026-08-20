import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-073.js";

describe("EX8-073", () => {
  it("gains +4000 DP when Gallantmon or X Antibody is in its digivolution cards when digivolving or attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 4000, condition: { kind: "selfDigivolutionStackHasTrait" } });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 4000, condition: { kind: "selfDigivolutionStackHasTrait" } });
  });
  it("once per turn deletes an opposing Digimon up to 10000 DP or trashes one if deletion fails, and grants immunity at 0 or less memory", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving" && entry.frequency === "OncePerTurn")?.actions).toMatchObject([{ kind: "Delete", target: { filter: { dp: { op: "lte", value: 10000 } } } }, { kind: "Trash", condition: { kind: "ifThisEffectDidNotDelete" } }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", condition: { kind: "memoryAtMost", value: 0 } });
  });
});
