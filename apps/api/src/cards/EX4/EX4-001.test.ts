import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-001.js";

describe("EX4-001 Missimon", () => {
  it("draws 1 on deletion only while its owner still has a Digimon in play", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions?.[0]).toMatchObject({ kind: "Draw", controller: "mine", amount: 1, condition: { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon"] } } });
  });
});
