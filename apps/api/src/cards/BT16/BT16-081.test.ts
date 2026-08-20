import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-081.js";

describe("BT16-081", () => {
  it("may delete an unsuspended opposing Digimon by deleting one of your Digimon or Tamers", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "Delete", optional: true, abortOnDecline: true, cost: { kind: "deleteOwn" }, target: { filter: { unsuspended: true, kind: ["Digimon"] } } });
      expect(effect.actions?.[1]).toMatchObject({ kind: "Delete", condition: { kind: "ifThisEffectDidNotDelete" }, target: { filter: { kind: ["Tamer"] } } });
    }
  });

  it("trashes the top of opponent security when another of yours is deleted", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "onDeletionOf", actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" }] }] });
  });
});
