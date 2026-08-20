import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-023.js";

describe("BT16-023", () => {
  it("unsuspends your Digimon and bottoms an opposing level 4 or lower Digimon", () => {
    for (const effect of compiled.effects.slice(0, 2)) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "Unsuspend", condition: { kind: "securityAtLeast", value: 3 } });
      expect(effect.actions?.[1]).toMatchObject({ kind: "Return", to: "deckBottom", condition: { kind: "securityAtMost", value: 3 } });
    }
  });

  it("has the inherited Pulsemon security-cost unsuspend", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "EndOfAttack", isInherited: true, frequency: "OncePerTurn" });
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({ kind: "Unsuspend", optional: true, abortOnDecline: true, cost: { kind: "trash" } });
  });
});
