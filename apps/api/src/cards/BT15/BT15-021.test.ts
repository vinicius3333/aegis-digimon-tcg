import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-021.js";

describe("BT15-021", () => {
  it("reveals three to add one Sea Beast/Plesiosaur/Beastkin/X Antibody card", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3 });
  });
  it("restricts one opposing Digimon with no more digivolution cards from attacking", () => expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Restrict", restriction: "attack", duration: "untilOpponentTurnEnd" }] }));
});
