import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-013.js";
import "../index.js";

describe("BT16-013", () => {
  it("has Blast Digivolve and reduces all opposing Digimon by 5000 on play or digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "ModifyDP", target: { count: "all" }, amount: -5000 }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "ModifyDP", amount: -5000 }],
    });
  });
  it("once per turn deletes an opposing 8000 DP or lower Digimon when security is removed, otherwise gains Security Attack +1", () =>
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "any" },
          actions: [
            { kind: "Delete" },
            {
              kind: "GainKeyword",
              keyword: { keyword: "SecurityAttack", amount: 1 },
              condition: { kind: "ifThisEffectDidNotDelete" },
            },
          ],
        },
      ],
    }));

  it("reduces all opposing Digimon by 5000 on play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-013", as: "valkyrimon" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first", dp: 9000 },
          { card: "BT1-009", as: "second", dp: 7000 },
        ],
      },
    });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("valkyrimon"));

    expect(s.perm("first").currentDP).toBe(4000);
    expect(s.perm("second").currentDP).toBe(2000);
  });

  it("deletes an opposing Digimon at the 8000 DP boundary when security is removed", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-013", as: "valkyrimon" }] },
        1: { battleArea: [{ card: "BT16-012", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
  });

  it("grants Security Attack +1 when security is removed but no target is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-013", as: "valkyrimon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 9000 }] },
    });

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });

    const continuous = (s.engine as unknown as { continuous: { hasKeyword: (id: string, keyword: string) => boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("valkyrimon").permanentId, "SecurityAttack")).toBe(true);
    expect(s.perm("target").currentDP).toBe(9000);
  });
});
