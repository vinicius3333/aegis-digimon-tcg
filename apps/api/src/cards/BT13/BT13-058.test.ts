import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-058.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT13-058 Leopardmon: Leopard Mode", () => {
  it("restricts opponent unsuspension, charges suspension for attack, and trashes its top card at turn end", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
        {
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Unsuspend",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          cost: {
            kind: "suspend",
            target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 },
          },
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [
        { kind: "Trash", target: { filter: { isSelfRef: true }, count: 1, isSelf: true, topCardOnly: true } },
        { kind: "Unsuspend", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" } },
      ],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Leopardmon"], cost: 1, isAlternate: true },
    ]);
  });

  it("loads the compiled Leopardmon: Leopard Mode implementation", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-058", as: "leopard" }] } });
    await s.ready();
    expect(s.perm("leopard").topCard?.cardId).toBe("BT13-058");
  });
});
