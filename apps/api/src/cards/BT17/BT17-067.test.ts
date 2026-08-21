import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-067.js";

describe("BT17-067 DexDoruGreymon", () => {
  it("installs the Trash replacement that digivolves a DoruGreymon before deletion", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      isFromTrash: true,
      actions: [{ kind: "Replacement", event: "wouldBeDeleted", target: { filter: { nameOrTrait: [{ tokens: ["DoruGreymon"], match: "name" }] } }, digivolveFromTrash: true }],
    });
  });

  it("keeps the inherited end-of-attack deletion once per turn", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "EndOfAttack", isInherited: true, frequency: "OncePerTurn" });
  });
});
