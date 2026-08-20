import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-045.js";

describe("BT16-045", () => {
  it("optionally suspends a Digimon and gives yours 3000 DP", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "Suspend", optional: true });
      expect(effect.actions?.[1]).toMatchObject({ kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd", optional: true });
    }
  });

  it("redirects an opponent's attack to a suspended Insectoid as inherited", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "OpponentsTurn", isInherited: true, frequency: "OncePerTurn" });
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack", optional: true }] });
  });
});
