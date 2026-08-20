import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-053.js";

describe("BT16-053", () => {
  it("models Barrier", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Barrier" }] });
  });

  it("prevents an opposing Digimon from attacking players on play and digivolution", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Restrict", restriction: "attackPlayers", duration: "untilOpponentTurnEnd" }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Restrict", restriction: "attackPlayers", duration: "untilOpponentTurnEnd" }] });
  });

  it("has inherited permanent DP", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }] });
  });
});
