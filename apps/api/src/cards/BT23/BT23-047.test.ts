import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-047.js";

describe("BT23-047 Examon", () => {
  it("suspends exactly five opposing Digimon/Tamers and locks every opposing Digimon's next unsuspend", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-047", as: "exa" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "one" },
            { card: "BT1-010", as: "two" },
            { card: "BT1-015", as: "three" },
            { card: "BT1-019", as: "four" },
            { card: "BT22-083", as: "tamer" },
            { card: "BT1-020", as: "sixth" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("exa"));

    for (const alias of ["one", "two", "three", "four", "tamer"]) expect(s.perm(alias).isSuspended).toBe(true);
    expect(s.perm("sixth").isSuspended).toBe(false);
    for (const alias of ["one", "two", "three", "four", "sixth"]) {
      expect(observe(s.engine).isRestricted(s.perm(alias), "unsuspend")).toBe(true);
    }
  });

  it("reacts to any opponent security removal, trashes an Option, deletes a suspended card, and fires once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-047", as: "exa" },
            { card: "BT1-009", as: "otherAttacker" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT23-100", as: "firstOption" },
            { card: "P-035", as: "secondOption" },
            { card: "BT1-009", as: "firstSuspended", suspended: true },
            { card: "BT1-010", as: "secondSuspended", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.perm("firstOption").placedByEffect = true;
    s.perm("secondOption").placedByEffect = true;
    const firstOptionId = s.perm("firstOption").topCard!.instanceId;
    const secondOptionId = s.perm("secondOption").topCard!.instanceId;
    const firstSuspendedId = s.perm("firstSuspended").permanentId;
    const secondSuspendedId = s.perm("secondSuspended").permanentId;

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", {
      removedFromSecuritySeat: 1,
      attackerPermanentId: s.perm("otherAttacker").permanentId,
    });
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === firstOptionId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === firstSuspendedId)).toBe(false);

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === secondOptionId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === secondSuspendedId)).toBe(true);
  });

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
      sourceFilter: { controller: "opponent" },
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
