import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-001.js";

describe("BT15-001", () => {
  it("returns one non-Sea Animal Avian/Bird/Beast/Animal/Sovereign Digimon from trash", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnDeletion", isInherited: true });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "Return", to: "hand", target: { count: 1, filter: { zone: "trash", kind: ["Digimon"], excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }] } } });
  });
});
