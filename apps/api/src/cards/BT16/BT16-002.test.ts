import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-002.js";

describe("BT16-002", () => {
  it("gains +1000 DP on all turns while it has two colors", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfColorCount", value: 2 } }] }));
});
