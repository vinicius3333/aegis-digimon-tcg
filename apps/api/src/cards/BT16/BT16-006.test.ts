import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-006.js";

describe("BT16-006", () => {
  it("gains 1 memory on deletion by trashing a hand card", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnDeletion", isInherited: true, actions: [{ kind: "GainMemory", amount: 1, cost: { kind: "trash" }, optional: false }] }));
});
