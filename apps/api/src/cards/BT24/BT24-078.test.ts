import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_078 } from "./BT24-078.js";
import "../index.js";

describe("BT24-078 Creepymon (X Antibody)", () => {
  it("digivolves from trash before trashing security and uses a dynamic total play-cost budget", () => {
    const trash = BT24_078.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0] as any;
    expect(trash).toMatchObject({
      event: "whenAttacking",
      fireCondition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "gte", value: 10 },
    });
    expect(trash.actions).toEqual([
      expect.objectContaining({
        kind: "Digivolve",
        from: ["trash"],
        payCost: false,
        abortOnDecline: true,
        ignoreRequirements: undefined,
      }),
      expect.objectContaining({ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" }),
    ]);

    const whenDigivolving = BT24_078.effects?.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions?.[1]).toMatchObject({
      kind: "PlayMultiple",
      from: ["trash"],
      totalCost: 4,
      totalCostScaling: { base: 4, raise: 4, per: 10, filter: { zone: "trash", controller: "opponent" } },
    });
  });

  it("does not trigger from trash below 10 cards in the opponent's trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-009", as: "creepymon" }],
          trash: [{ card: "BT24-078", as: "creepymonX" }],
          deck: ["BT1-001"],
        },
        1: {
          security: ["BT1-002", "BT1-003"],
          trash: Array.from({ length: 9 }, () => "BT1-004"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttacking", {
      attackerPermanentId: s.perm("creepymon").permanentId,
    });

    expect(s.perm("creepymon").topCard.cardId).toBe("EX10-009");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("creepymonX").instanceId);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("digivolves an attacking Creepymon from trash for free and then trashes security at 10", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-009", as: "creepymon" }],
          trash: [{ card: "BT24-078", as: "creepymonX" }],
          deck: ["BT1-001"],
        },
        1: {
          security: ["BT1-002", "BT1-003"],
          trash: Array.from({ length: 10 }, () => "BT1-004"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttacking", {
      attackerPermanentId: s.perm("creepymon").permanentId,
    });
    await settle(() => s.perm("creepymon").topCard.instanceId === s.inst("creepymonX").instanceId);

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("deletes every lowest-level Digimon and plays 8 total cost at 10 opposing trash cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-078", as: "creepymonX" }],
          trash: [
            { card: "BT12-073", as: "firstPlay" },
            { card: "BT15-072", as: "secondPlay" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowA" },
            { card: "BT1-010", as: "lowB" },
            { card: "BT1-014", as: "high" },
          ],
          trash: Array.from({ length: 10 }, () => "BT1-001"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const lowAId = s.perm("lowA").permanentId;
    const lowBId = s.perm("lowB").permanentId;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("creepymonX"));
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("firstPlay").instanceId,
        ) &&
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("secondPlay").instanceId,
        ),
    );

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lowAId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lowBId);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
