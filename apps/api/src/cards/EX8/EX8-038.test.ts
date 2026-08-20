import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-038.js";

describe("EX8-038", () => {
  it("may suspend one Digimon on play", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Suspend", optional: true, target: { count: 1 } }));
  it("inherits Retaliation", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Retaliation", raw: "＜Retaliation＞" }));
});
