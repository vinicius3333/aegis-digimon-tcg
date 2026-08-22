import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-080.js";

describe("BT13-080 ProtoGizmon", () => {
  it("reduces its play cost by deleting a level 2 Digimon in the breeding area", () => {
    const replacement = compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0] as { actions?: unknown[] };
    expect(replacement).toMatchObject({ kind: "Replacement", event: "wouldBePlayed", sourceFilter: { controllerDefault: "mine", nameOrTrait: [{ match: "name", tokens: ["ProtoGizmon"] }] } });
    expect(replacement.actions?.[0]).toMatchObject({
      kind: "Replacement", event: "wouldBePlayed", mode: "reduceCost", amount: 2,
      cost: { kind: "deleteOwn", target: { filter: { controller: "mine", kind: ["Digimon"], levels: [2] }, count: 1 } },
    });
  });

  it("draws then trashes on play and cannot digivolve", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toEqual([
      { kind: "Draw", controller: "mine", amount: 1 },
      expect.objectContaining({ kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } }),
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0]).toMatchObject({ kind: "Restrict", restriction: "digivolve", duration: "permanent" });
  });

  it("returns two Gizmon cards before optionally playing Gizmon: AT", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost", from: ["trash"], optional: true,
      target: { filter: { controller: "mine", nameOrTrait: [{ match: "name", tokens: ["Gizmon: AT"] }] }, count: 1 },
      cost: { kind: "return", target: { filter: { zone: "trash", controller: "mine", nameOrTrait: [{ match: "name", tokens: ["Gizmon"] }] }, count: 2 } },
    });
  });
});
