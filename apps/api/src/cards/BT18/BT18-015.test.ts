import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-015.js";

describe("BT18-015 Kimeramon", () => {
  it("retains its lowest-DP deletion clauses, DNA deletion trigger, and inherited Security Attack", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Delete", cost: { kind: "deleteOwn" }, target: { filter: { controller: "opponent", superlative: "lowestDP" } } }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenAttacking", actions: [{ kind: "Delete", cost: { kind: "deleteOwn" }, target: { filter: { controller: "opponent", superlative: "lowestDP" } } }] });
    expect(compiled.effects[2]).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "DnaDigivolve", optional: true, additionalMaterials: [{ filter: { zone: "trash", nameOrTrait: [{ tokens: ["Kimeramon"], match: "name" }] } }] }] });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-030", as: "kimeramon", under: ["BT18-015"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("kimeramon"), "SecurityAttack")).toBe(true);
  });
});
