import { getCardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX3-001.js";

type UnsuspendEngine = { unsuspendForActivePhase(seat: Seat): Promise<string[]> };

async function unsuspend(s: ReturnType<typeof setupEngine>, seat: Seat = 0): Promise<string[]> {
  return (s.engine as unknown as UnsuspendEngine).unsuspendForActivePhase(seat);
}

describe("EX3-001 Bebydomon", () => {
  it("matches its official errata identity and inherited text", () => {
    expect(getCardDefinition("EX3-001")).toMatchObject({
      nameEn: "Bebydomon",
      colors: ["Blue"],
      level: 2,
      forms: ["In-Training"],
      types: ["Baby Dragon"],
      imageId: "EX3-001-Errata",
      inheritedEffectText:
        "[All Turns][Once Per Turn] When this Digimon with [Dramon] or [Examon] in its name becomes unsuspended, this Digimon gets +1000 DP for the turn.",
    });
  });

  it("publishes the errata-scoped inherited metadata without a ghost DP action", () => {
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "AllTurns",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenUnsuspended",
              sourceFilter: {
                isSelfRef: true,
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Dramon", "Examon"], match: "name" }],
              },
              actions: [{ kind: "ModifyDP", amount: 1000 }],
            },
          ],
        },
      ],
    });
  });

  it.each(["EX3-008", "EX3-018", "EX3-074"])(
    "gives its qualifying %s carrier +1000 DP when it becomes active",
    async (card) => {
      const s = setupEngine({ 0: { battleArea: [{ card, under: ["EX3-001"], as: "carrier", suspended: true }] } });
      await s.engine.recomputeContinuousEffects();
      const initial = s.perm("carrier").currentDP;
      expect(await unsuspend(s)).toEqual([s.perm("carrier").permanentId]);
      expect(s.perm("carrier").currentDP).toBe(initial + 1000);
    },
  );

  it("does not activate for carriers outside the errata name gate", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-038", under: ["EX3-001"], as: "wrongName", suspended: true },
          { card: "BT11-022", under: ["EX3-001"], as: "nearMatch", suspended: true },
          { card: "EX3-008", under: ["EX3-001"], as: "alreadyActive" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    const wrongDp = s.perm("wrongName").currentDP;
    const nearMatchDp = s.perm("nearMatch").currentDP;
    const activeDp = s.perm("alreadyActive").currentDP;
    expect(await unsuspend(s)).toEqual([s.perm("wrongName").permanentId, s.perm("nearMatch").permanentId]);
    expect(s.perm("wrongName").currentDP).toBe(wrongDp);
    expect(s.perm("nearMatch").currentDP).toBe(nearMatchDp);
    expect(s.perm("alreadyActive").currentDP).toBe(activeDp);
  });

  it("does not trigger when a qualifying carrier is already unsuspended", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX3-008", under: ["EX3-001"], as: "carrier" }] } });
    await s.engine.recomputeContinuousEffects();
    const initial = s.perm("carrier").currentDP;
    expect(await unsuspend(s)).toEqual([]);
    expect(s.perm("carrier").currentDP).toBe(initial);
  });

  it("is once per turn and lets two inherited copies trigger independently", async () => {
    const one = setupEngine({
      0: { battleArea: [{ card: "EX3-008", under: ["EX3-001"], as: "carrier", suspended: true }] },
    });
    await one.engine.recomputeContinuousEffects();
    const initial = one.perm("carrier").currentDP;
    await unsuspend(one);
    one.perm("carrier").isSuspended = true;
    await unsuspend(one);
    expect(one.perm("carrier").currentDP).toBe(initial + 1000);

    await advance(one.engine).runTurn(0);
    expect(one.perm("carrier").currentDP).toBe(initial);
    one.perm("carrier").isSuspended = true;
    await unsuspend(one);
    expect(one.perm("carrier").currentDP).toBe(initial + 1000);

    const two = setupEngine({
      0: { battleArea: [{ card: "EX3-008", under: ["EX3-001", "EX3-001"], as: "carrier", suspended: true }] },
    });
    await two.engine.recomputeContinuousEffects();
    const twoInitial = two.perm("carrier").currentDP;
    await unsuspend(two);
    expect(two.perm("carrier").currentDP).toBe(twoInitial + 2000);
  });
});
