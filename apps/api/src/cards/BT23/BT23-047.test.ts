import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-047.js";

describe("BT23-047 Examon", () => {
  it("declares Piercing, Security Attack +1, and Partition", () => {
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((keyword) => keyword.keyword) ?? []),
    ).toEqual(["Piercing", "SecurityAttack", "Partition"]);
  });

  it("suspends five opposing Digimon/Tamers, restricts Digimon unsuspension, then may attack on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions;
      expect(actions[0]).toMatchObject({
        kind: "Suspend",
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 5 },
      });
      expect(actions[1]).toMatchObject({
        kind: "Restrict",
        restriction: "unsuspend",
        duration: "untilTheirNextUnsuspendPhase",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
      });
      expect(actions[2]).toMatchObject({
        kind: "Attack",
        target: { filter: { isSelfRef: true }, isSelf: true },
        optional: true,
      });
    }
  });

  it("once per turn trashes only an effect-played opponent Option, then deletes one suspended opposing Digimon/Tamer", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn") as any;
    const watcher = effect.actions[0];
    expect(effect.frequency).toBe("OncePerTurn");
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Trash",
          target: {
            filter: { zone: "battleArea", controller: "opponent", kind: ["Option"], placedInBattleAreaByEffect: true },
            count: 1,
          },
        },
        {
          kind: "Delete",
          target: { filter: { controllerDefault: "opponent", suspended: true, kind: ["Digimon", "Tamer"] }, count: 1 },
        },
      ],
    });
  });
});
