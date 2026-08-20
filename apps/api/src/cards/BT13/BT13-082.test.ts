import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-082.js";

describe("BT13-082 Peckmon", () => {
  it("has Blocker", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toEqual(
      expect.arrayContaining([expect.objectContaining({ keyword: "Blocker" })]),
    );
  });

  it("lets the opponent trash from hand when deleted outside battle", () => {
    const inherited = compiled.effects?.find((entry) => entry.isInherited);
    expect(inherited?.actions?.[0]).toMatchObject({
      kind: "Trash", chooser: "opponent",
      target: { filter: { controller: "opponent", zone: "hand" }, count: 1 },
      condition: { kind: "not", condition: { kind: "triggerRemovalCause", removalCause: "byBattle" } },
    });
  });
});
