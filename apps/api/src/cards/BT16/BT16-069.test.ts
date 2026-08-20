import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-069.js";

describe("BT16-069", () => {
  it("trashes three digivolution cards when Gesomon or X Antibody is underneath", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "TrashDigivolution", amount: 3, condition: { kind: "selfDigivolutionStackHasTrait" } });
      expect(effect.actions?.[1]).toMatchObject({ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd", target: { filter: { digivolutionCards: "none" } } });
    }
  });

  it("draws and trashes one card as inherited once per turn", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Draw", amount: 1 }, { kind: "Trash", target: { count: 1 } }] });
  });
});
