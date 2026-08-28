import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-081.js";
import "../index.js";

describe("BT16-081", () => {
  it("may delete an unsuspended opposing Digimon by deleting one of your Digimon or Tamers", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "Delete",
        cost: { kind: "deleteOwn" },
        target: { filter: { unsuspended: true, kind: ["Digimon"] } },
      });
      expect(effect.actions?.[0]).not.toHaveProperty("optional");
      expect(effect.actions?.[0]).not.toHaveProperty("abortOnDecline");
      expect(effect.actions?.[1]).toMatchObject({
        kind: "Delete",
        condition: { kind: "ifThisEffectDidNotDelete" },
        target: { filter: { kind: ["Tamer"] } },
      });
    }
  });

  it("trashes the top of opponent security when another of yours is deleted", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { deleteCause: "byEffect" },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" }],
        },
      ],
    });
  });

  it("naturally digivolves, pays the deletion cost first, and trashes opposing security", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-072", as: "base" },
            { card: "BT16-042", as: "cost" },
          ],
          hand: [{ card: "BT16-081", as: "malo" }],
        },
        1: { battleArea: [{ card: "BT16-042", as: "target" }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    const costId = s.perm("cost").permanentId;
    const targetId = s.perm("target").permanentId;
    preferredInstanceIds.push(costId, targetId);

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("malo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === costId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
