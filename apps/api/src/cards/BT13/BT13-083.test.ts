import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-083.js";

describe("BT13-083 Gizmon: AT", () => {
  it("reduces play cost by deleting a level 3 Digimon", () => {
    const replacement = compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0] as { actions?: unknown[] };
    expect(replacement.actions?.[0]).toMatchObject({
      kind: "Replacement", mode: "reduceCost", amount: 4,
      cost: { kind: "deleteOwn", target: { filter: { controller: "mine", kind: ["Digimon"], levels: [3] }, count: 1 } },
    });
  });

  it("draws 2, trashes 2, and cannot digivolve", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({ kind: "Draw", amount: 2 });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[1]).toMatchObject({ kind: "Trash", target: { count: 2 } });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0]).toMatchObject({ kind: "Restrict", restriction: "digivolve", duration: "permanent" });
  });

  it("returns two Gizmon cards before optionally playing Gizmon: XT", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost", optional: true, from: ["trash"],
      target: { filter: { nameOrTrait: [{ match: "name", tokens: ["Gizmon: XT"] }] }, count: 1 },
      cost: { kind: "return", target: { filter: { zone: "trash", nameOrTrait: [{ match: "name", tokens: ["Gizmon"] }] }, count: 2 } },
    });
  });
});
