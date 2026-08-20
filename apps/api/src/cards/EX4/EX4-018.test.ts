import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-018.js";

describe("EX4-018 MailBirdramon", () => {
  it("gives the lowest-level opposing Digimon a temporary attack trigger", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({ kind: "GrantAuraToOpponents", target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" } }, effectText: "[When Attacking] Lose 2 memory", duration: "untilOpponentTurnEnd" });
  });
  it("has Save on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.keywords).toMatchObject([{ keyword: "Save" }]);
  });
});
