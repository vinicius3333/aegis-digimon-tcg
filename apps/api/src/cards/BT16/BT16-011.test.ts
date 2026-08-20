import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-011.js";

describe("BT16-011", () => {
  it("returns a red Digimon from trash and conditionally deletes an opposing Digimon at or below this DP", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "Return", to: "hand", optional: false });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({ kind: "Delete", condition: { kind: "selfDigivolutionStackHasTrait" }, target: { filter: { dp: { op: "lte", relativeToSource: true } } } });
  });
  it("gains Rush when a red card returns from trash and trashes opponent security on deletion", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenCardReturnsFromTrashToHand", actions: [{ kind: "GainKeyword", keyword: { keyword: "Rush" } }] }] });
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "OnDeletion", isInherited: true, actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" }] });
  });
});
