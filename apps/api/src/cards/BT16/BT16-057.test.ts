import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-057.js";

describe("BT16-057", () => {
  it("de-digivolves an opposing Digimon by 1 by placing another DigiPolice Digimon underneath itself", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", keywords: [{ keyword: "Blocker" }, { keyword: "Armor Purge" }], actions: [{ kind: "DeDigivolve", amount: 1, optional: true, abortOnDecline: true, cost: { kind: "place", destination: "digivolutionStack", position: "bottom", host: "self" } }] });
  });

  it("cannot attack on your turn", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "Restrict", restriction: "attack", duration: "permanent" }] });
  });
});
