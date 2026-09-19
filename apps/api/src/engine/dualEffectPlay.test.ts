import { describe, expect, it } from "vitest";
import { setupEngine } from "./testkit/harness.js";
import { advance } from "./testkit/advance.js";
import "../cards/index.js";

describe("effect play eligibility (CR 7-1-1, September 19 VPS report)", () => {
  it.each(["hand", "trash", "deck", "security"] as const)(
    "leaves Dual and Option cards in %s while allowing a normal Digimon",
    async (zone) => {
      const s = setupEngine({
        0: {
          [zone]: [
            { card: "EX13-066", as: "dual" },
            { card: "ST12-15", as: "option" },
            { card: "BT1-010", as: "digimon" },
          ],
        },
      });
      await s.ready();
      await advance(s.engine).verb.playInstances(
        ["dual", "option", "digimon"].map((alias) => s.inst(alias).instanceId),
      );
      expect(s.state.players[0]![zone].map((card) => card.cardId)).toEqual(["EX13-066", "ST12-15"]);
      expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT1-010"]);
    },
  );

  it("also guards the dedicated security play primitive", async () => {
    const s = setupEngine({ 0: { security: [{ card: "EX13-066", as: "dual" }] } });
    await s.ready();
    await advance(s.engine).verb.playFromSecurity(s.inst("dual").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
