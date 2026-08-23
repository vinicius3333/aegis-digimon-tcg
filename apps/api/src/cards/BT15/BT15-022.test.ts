import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-022.js";

describe("BT15-022", () => {
  it("preserves inherited protection from deletion in security battles", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      actions: [{ kind: "Restrict", restriction: "beDeletedInBattle" }],
    }));
  it("restricts an opposing Digimon from attacking when played by an effect", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "Restrict",
          restriction: "attack",
          duration: "untilOpponentTurnEnd",
          condition: { kind: "triggerEnteredByEffect" },
        },
      ],
    }));
  it("preserves inherited Jamming and security-battle deletion protection", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Jamming" }],
      actions: [{ kind: "Restrict", restriction: "beDeletedInBattle" }],
    }));
});
