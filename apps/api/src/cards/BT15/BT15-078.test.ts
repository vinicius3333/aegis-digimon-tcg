import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-078.js";

describe("BT15-078", () => {
  it("gives opponent-played Digimon an On Deletion memory loss effect once per turn", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "GrantAuraToOpponents", duration: "untilOpponentTurnEnd" }] }] }));
  it("may play a level 4 or lower opposing Digimon from trash suspended and redirect the attack", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenAttacking", actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, suspended: true, suppressOnPlayEffects: true }, { kind: "RedirectAttack", optional: true, condition: { kind: "bindingExists" } }] }));
});
