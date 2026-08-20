import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-095.js";

describe("BT14-095", () => {
  it("makes one opposing Digimon cause its controller to lose 2 memory when suspended", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main", actions: [{ kind: "GrantAuraToOpponents", duration: "untilOpponentTurnEnd", effectText: "[All Turns] When this Digimon becomes suspended, lose 2 memory." }] });
  });

  it("activates its main effect and returns itself from security", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }, { kind: "AddToHandSelf" }] });
  });
});
