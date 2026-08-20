import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-024.js";

describe("EX6-024 Gokuumon", () => {
  it("shares DigiXros Security Attack reduction and suspends an opposing Digimon or Tamer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 } }, { kind: "Restrict", restriction: "suspend", condition: { kind: "digiXrosCount", minimum: 1 } }]);
  });
  it("inherits Security Attack -1 and returns an opposing yellow Digimon on leave", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 } });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "Replacement", actions: [{ kind: "Return", to: "hand" }] });
  });
});
