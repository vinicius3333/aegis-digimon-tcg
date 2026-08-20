import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-031.js";

describe("EX9-031", () => {
  it("reduces Ver.3 digivolution cost and has Security A. +1", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static" && entry.actions.length > 0)).toMatchObject({ actions: [{ kind: "Replacement", actions: [{ mode: "reduceCost", amount: 1 }] }] });
    expect(compiled.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "SecurityAttack"))?.keywords).toContainEqual({ keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" });
  });
  it("recovers on digivolving or attacking by trashing a bottom face-down source", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SecurityManipulation", op: "addTop", amount: 1, cost: { kind: "trash", target: { filter: { zone: "digivolutionCards", faceDown: true, position: "bottom" } } } }] });
  });
  it("inherits an opposing -4000 DP response when security is removed", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved" }] }));
});
