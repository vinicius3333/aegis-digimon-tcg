import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-052.js";

describe("BT21-052 Examon (X Antibody)", () => {
  it("models the printed keywords and When Digivolving sequence", () => {
    expect(compiled.effects.filter((effect) => effect.keywords?.length)).toHaveLength(3);
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");

    expect(effect?.actions).toEqual([
      {
        kind: "Suspend",
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: "all" },
      },
      {
        kind: "Delete",
        target: {
          filter: { controller: "opponent", suspended: true, kind: ["Digimon", "Tamer"] },
          count: 1,
        },
      },
    ]);
  });

  it("keeps the once-per-turn suspension watcher scoped to its own trigger", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    const watcher = effect?.actions[0];

    expect(effect?.frequency).toBe("OncePerTurn");
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { isSelfRef: true },
    });
    const watcherActions = (watcher as { actions?: unknown[] } | undefined)?.actions;
    expect(watcherActions).toHaveLength(2);
    expect(watcherActions?.[1]).toMatchObject({
      kind: "trashSecurityTop",
      controller: "opponent",
      count: 1,
      condition: { kind: "selfDigivolutionStackHasTrait" },
    });
  });
});
