import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-061.js";

describe("BT13-061 Gotsumon", () => {
  it("keeps Blocker and opponent-turn black-card reveal", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [expect.objectContaining({ keyword: "Blocker" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "OnDeletion", actions: [expect.objectContaining({ kind: "RevealAdd", revealCount: 3, condition: expect.objectContaining({ kind: "isOpponentsTurn" }) })] });
  });
});
