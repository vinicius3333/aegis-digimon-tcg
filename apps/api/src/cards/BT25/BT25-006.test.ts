import { describe, expect, it } from "vitest";
import { compiled as BT25_006 } from "./BT25-006.js";
import "../index.js";

describe("BT25-006 Dorimon", () => {
  it("trashes one hand card when the opponent attacks, then unsuspends one Titan Digimon", () => {
    const effect = BT25_006.effects?.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({ trigger: "OpponentsTurn", frequency: "OncePerTurn" });
    expect(effect?.actions?.[0]).toMatchObject({
      event: "whenOpponentAttacks",
      sourceFilter: { controller: "opponent", kind: ["Digimon"] },
      cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
    });
    const watcher = effect?.actions?.[0] as { actions?: unknown[] } | undefined;
    expect(watcher?.actions?.[0]).toMatchObject({
      kind: "Unsuspend",
      target: {
        filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Titan"], match: "trait" }] },
        count: 1,
      },
    });
  });
});
