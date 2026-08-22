import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-010.js";

describe("EX11-010 MasterTyrannomon", () => {
  it("requires this Digimon to be the suspended subject before granting +4000 DP", () => {
    const compiled = runtimeCompiledCard("EX11-010")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          expect.objectContaining({ kind: "Suspend", optional: true }),
          {
            kind: "SubTrigger",
            event: "whenSuspended",
            sourceFilter: { isSelfRef: true },
            actions: [{ kind: "ModifyDP", amount: 4000, duration: "untilOpponentTurnEnd" }],
          },
        ],
      });
    }
    expect(compiled.effects[0]?.keywords).toEqual([
      { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
      { keyword: "Fortitude", raw: "＜Fortitude＞" },
    ]);
    expect(compiled.effects[3]).toMatchObject({
      isInherited: true,
      keywords: [{ keyword: "SecurityAttack", amount: 1 }],
    });
  });
});
