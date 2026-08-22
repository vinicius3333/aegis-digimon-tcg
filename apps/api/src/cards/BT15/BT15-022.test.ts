import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-022.js";

describe("BT15-022", () => {
  it("restricts an opposing Digimon from attacking when played by an effect", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Restrict", restriction: "attack", duration: "untilOpponentTurnEnd", condition: { kind: "triggerEnteredByEffect" } }] }));
  it("preserves inherited Jamming against Security Digimon", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "Static", isInherited: true, actions: [], keywords: [{ keyword: "Jamming" }] }));
});
