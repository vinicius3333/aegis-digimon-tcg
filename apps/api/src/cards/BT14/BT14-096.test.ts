import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-096.js";

describe("BT14-096", () => {
  it("suspends an already suspended opposing Digimon and restricts unsuspension with Mimi", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "Suspend", target: { filter: { controller: "opponent" } } });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({ kind: "Restrict", restriction: "unsuspend", target: { sameTarget: true }, duration: "untilOpponentTurnEnd", condition: { kind: "youHave" } });
  });
  it("activates main and returns itself from security", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }, { kind: "AddToHandSelf" }] }));
});
