import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-049.js";

describe("EX8-049", () => {
  it("de-digivolves an opposing Digimon by 1 on play and deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "DeDigivolve", amount: 1, target: { count: 1 } });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({ kind: "DeDigivolve", amount: 1, target: { count: 1 } });
  });
  it("inherits Blocker", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" }));
});
