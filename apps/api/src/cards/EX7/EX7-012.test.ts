import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-012.js";

describe("EX7-012 Galgomon", () => {
  it("deletes a 6000 DP or lower Digimon on play", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Delete", target: { filter: { dp: { op: "lte", value: 6000 } } } }));
  it("gains memory when no opposing Digimon is at 6000 DP or less and inherits Security Attack +1", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "opponentHasNone" } });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords?.[0]).toMatchObject({ keyword: "SecurityAttack", amount: 1 });
  });
});
