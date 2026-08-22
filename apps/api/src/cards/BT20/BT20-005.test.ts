import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-005.js";

describe("BT20-005 Kapurimon", () => {
  it("grants Jamming only when this Digimon checks face-up security", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    expect(effect?.trigger).toBe("YourTurn");
    expect(effect?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenCheckedFaceUpSecurity",
      actions: [{ kind: "GainKeyword", duration: "forTheTurn", target: { isSelf: true } }],
    });
  });
});
