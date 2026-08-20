import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-005.js";

describe("BT16-005", () => {
  it("once per turn gains memory when another Blocker Digimon is deleted", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "onDeletionOf", sourceFilter: { excludeSelf: true, keywords: ["Blocker"] }, actions: [{ kind: "GainMemory", amount: 1 }] }] }));
});
