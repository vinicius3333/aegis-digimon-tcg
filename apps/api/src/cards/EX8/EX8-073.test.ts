import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX8-073.js";

describe("EX8-073", () => {
  it("gains +4000 DP when Gallantmon or X Antibody is in its digivolution cards when digivolving or attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "ModifyDP", amount: 4000, condition: { kind: "selfDigivolutionStackHasTrait" } },
      { kind: "ModifyDP", amount: -4000, target: { filter: { controller: "opponent" } } },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions).toMatchObject([
      { kind: "ModifyDP", amount: 4000, condition: { kind: "selfDigivolutionStackHasTrait" } },
      { kind: "ModifyDP", amount: -4000, target: { filter: { controller: "opponent" } } },
    ]);
  });
  it("once per turn deletes an opposing Digimon up to 10000 DP or trashes one if deletion fails, and grants immunity at 0 or less memory", () => {
    expect(
      compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving" && entry.frequency === "OncePerTurn")
        ?.actions,
    ).toMatchObject([
      { kind: "Delete", target: { filter: { dp: { op: "lte", value: 10000 } } } },
      { kind: "Trash", condition: { kind: "ifThisEffectDidNotDelete" } },
      { kind: "Unsuspend", condition: { kind: "ifThisEffectDidNotDelete" } },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "immuneToOpponentDigimonEffects",
      condition: { kind: "memoryAtMost", value: 0 },
    });
  });

  it("publicly grants the printed opponent-Digimon immunity at exactly 0 memory", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-073", as: "gallantmon-x" }] } });
    s.state.memory = 0;
    await (s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();
    expect(observe(s.engine).hasRestriction(s.perm("gallantmon-x"), "beAffected", "Digimon")).toBe(true);

    s.state.memory = 1;
    await (s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();
    expect(observe(s.engine).hasRestriction(s.perm("gallantmon-x"), "beAffected", "Digimon")).toBe(false);
  });
});
