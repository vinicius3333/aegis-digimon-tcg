import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-003.js";

describe("BT16-003", () => {
  it("has inherited Blocker during the opponent's turn when it has two colors", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "OpponentsTurn", isInherited: true, keywords: [{ keyword: "Blocker" }], condition: { kind: "selfColorCount", value: 2 } }));
});
