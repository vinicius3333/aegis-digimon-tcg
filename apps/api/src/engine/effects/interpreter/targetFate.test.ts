import { describe, expect, it } from "vitest";
import type { Action } from "@aegis/shared";
import { targetFateOf } from "./targetFate.js";

/** Only the action's `kind` decides a fate, so every case shares one inert target. */
const target = { filter: {}, count: 1 };

describe("targetFateOf", () => {
  it("reports deletion for every deletion-shaped action kind", () => {
    const kinds = [
      "Delete",
      "DeletePerColor",
      "DeleteUntilCount",
      "DeleteBudget",
      "DeleteByStackColorBudget",
      "DeleteLevelBudget",
      "DeleteByDPBudget",
      "DelayedDelete",
    ] as const;
    for (const kind of kinds) {
      expect(targetFateOf({ kind, target } as unknown as Action), kind).toBe("delete");
    }
  });

  it("splits a return by its destination", () => {
    expect(targetFateOf({ kind: "Return", target, to: "hand" } as unknown as Action)).toBe("returnToHand");
    expect(targetFateOf({ kind: "Return", target, to: "deckTop" } as unknown as Action)).toBe("returnToDeck");
    expect(targetFateOf({ kind: "Return", target, to: "deckBottom" } as unknown as Action)).toBe("returnToDeck");
    expect(targetFateOf({ kind: "ReturnToEggDeck", target } as unknown as Action)).toBe("returnToEggDeck");
  });

  it("reports the board-state actions whose outcome the kind alone fixes", () => {
    expect(targetFateOf({ kind: "Trash", target } as unknown as Action)).toBe("trash");
    expect(targetFateOf({ kind: "Suspend", target } as unknown as Action)).toBe("suspend");
    expect(targetFateOf({ kind: "Unsuspend", target } as unknown as Action)).toBe("unsuspend");
    expect(targetFateOf({ kind: "Digivolve", target } as unknown as Action)).toBe("digivolve");
  });

  it("reports nothing for an action whose outcome the kind does not determine", () => {
    // A badge that could be wrong is worse than no badge, so anything resolution-
    // dependent (a branch, a play, a raw clause) stays unlabelled.
    expect(targetFateOf({ kind: "ConditionalBranch" } as unknown as Action)).toBeUndefined();
    expect(targetFateOf({ kind: "PlayWithoutCost" } as unknown as Action)).toBeUndefined();
    expect(targetFateOf({ kind: "ModifyDP", target } as unknown as Action)).toBeUndefined();
    expect(targetFateOf({ kind: "RawUnparsed" } as unknown as Action)).toBeUndefined();
  });
});
