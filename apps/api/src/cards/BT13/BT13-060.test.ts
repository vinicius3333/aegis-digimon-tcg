import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-060.js";

describe("BT13-060 Rosemon: Burst Mode", () => {
  it("has complete compiled coverage and no residual gaps", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [
        expect.objectContaining({ kind: "Digivolve", into: { name: "Rosemon" }, payCost: false }),
        expect.objectContaining({
          kind: "Return",
          to: "hand",
          target: {
            filter: { controllerDefault: "mine", nameOrTrait: [{ match: "name", tokens: ["Yoshino Fujieda"] }] },
            count: 1,
          },
        }),
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [expect.objectContaining({ kind: "TrashDigivolution", amount: 1, position: "top" })],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        expect.objectContaining({
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        }),
        expect.objectContaining({
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Tamer"] }, count: 1 },
        }),
        expect.objectContaining({
          kind: "Restrict",
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
          target: { count: "all", filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
        }),
      ],
    });
    expect(compiled.effects[0]?.actions.some((action) => action.kind === "Unsuspend")).toBe(false);
    expect(compiled.effects[3]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          scaling: {
            per: 2,
            unit: "cards",
            filter: { controller: "opponent", suspended: true, kind: ["Digimon", "Tamer"] },
          },
        },
      ],
    });
  });

  it("suspends an opposing Digimon and Tamer when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-060", as: "roseBurst" }] },
      1: {
        battleArea: [
          { card: "BT13-111", as: "digimon" },
          { card: "BT13-095", as: "tamer" },
        ],
      },
    });
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("roseBurst"));
    await settle(() => s.perm("digimon").isSuspended && s.perm("tamer").isSuspended);
    expect(s.perm("digimon").isSuspended).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(true);
  });
});
