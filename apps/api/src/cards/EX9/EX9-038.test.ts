import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-038.js";

describe("EX9-038", () => {
  it("has Training and suspends an opposing Digimon with an unsuspend restriction on play and attack", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({ keyword: "Training", raw: "＜Training＞" });
    for (const trigger of ["OnPlay", "WhenAttacking"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "Suspend", cost: { kind: "place", target: { filter: { zone: "hand" } } } }, { kind: "Restrict", restriction: "unsuspend", target: { sameTarget: true } }] });
  });
  it("inherits Piercing", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Piercing", raw: "＜Piercing＞" }));
});
