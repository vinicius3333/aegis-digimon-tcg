import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-044.js";

describe("EX8-044", () => {
  it("has Blast Digivolve and may suspend up to 3 Digimon, gaining memory for suspended opposing Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]).toMatchObject({ keyword: "BlastDigivolve" });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "Suspend", optional: true, target: { count: 3, upTo: true } }, { kind: "GainMemory", amount: 1, scaling: { per: 1 } }]);
  });
  it("inherits a once-per-turn effect when suspended that grants Piercing and +3000 DP", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenSuspended", actions: [{ kind: "GainKeyword", keyword: { keyword: "Piercing" } }, { kind: "ModifyDP", amount: 3000 }] }));
});
