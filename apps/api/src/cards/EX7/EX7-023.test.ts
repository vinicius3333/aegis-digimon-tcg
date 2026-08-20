import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-023.js";

describe("EX7-023 Hexeblaumon", () => {
  it("has Security Attack +1 and Ice Clad and trashes four evolution cards on digivolving", () => {
    expect(compiled.effects?.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords ?? []).map((keyword) => keyword.keyword)).toEqual(expect.arrayContaining(["SecurityAttack", "IceClad"]));
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "TrashDigivolution", totalAmount: 4 });
  });
  it("suspends opposing Digimon with no more evolution cards than this Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({ kind: "Restrict", restriction: "suspend", duration: "permanent", target: { count: "all", filter: { digivolutionCardsCompareToSource: "lte" } } }));
});
