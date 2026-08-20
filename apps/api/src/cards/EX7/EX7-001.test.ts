import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-001.js";

describe("EX7-001 Palmon", () => {
  it("inherits +2000 DP while the opponent has one or fewer Digimon", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 2000 }, while: { kind: "opponentHas" } }] }));
});
