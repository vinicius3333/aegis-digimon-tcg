import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-060.js";

describe("BT15-060", () => {
  it("treats itself as Omnimon when revealed and may digivolve into a black Greymon/Garurumon", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "GrantStatic", grant: "name", tokens: ["Omnimon"], condition: { kind: "triggerRevealedFromDeck" } });
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({ kind: "Digivolve", from: ["hand"], reduceCost: 2, optional: true, condition: { kind: "isYourTurn" } });
  });
  it("once per turn de-digivolves an opposing Digimon to level 3 as an inherited effect", () => expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "DeDigivolve", amount: 1, stopAtLevel: 3 }] }));
});
