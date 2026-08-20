import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-013.js";

describe("EX9-013", () => {
  it("has Blast Digivolve, Alliance, and Blocker", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]).toMatchObject({ keyword: "BlastDigivolve" });
    expect(compiled.effects?.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords ?? [])).toEqual(expect.arrayContaining([{ keyword: "Alliance", raw: "＜Alliance＞" }, { keyword: "Blocker", raw: "＜Blocker＞" }]));
  });
  it("de-digivolves by 3 on play and digivolving and can DNA digivolve at end of turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "DeDigivolve", amount: 3 });
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions).toMatchObject([{ kind: "DnaDigivolve", from: ["hand"], payCost: false, optional: true }, { kind: "Attack", optional: true }]);
  });
});
