import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-092.js";

describe("BT13-092 BT13-092", () => {
  it("matches burst timing and the two When Digivolving clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toContainEqual({
      names: ["Ravemon"],
      cost: 0,
      isAlternate: true,
      burstDigivolve: { returnTamerNamesExact: ["Keenan Crier"] },
    });
    expect(compiled.effects[0]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "TrashDigivolution",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 1,
          position: "top",
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Trash", chooser: "opponent", target: { filter: { controller: "opponent", zone: "hand" }, count: 1 } },
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "opponent",
          condition: { kind: "zoneCount", seat: "opponent", zone: "hand", op: "lte", value: 7 },
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
          optional: true,
          cost: {
            kind: "return",
            target: { filter: { zone: "trash", controller: "opponent", kind: ["Digimon"] }, count: 1 },
          },
        },
      ],
    });
  });

  it("loads the compiled implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-092", as: "card" }] } });
    await s.ready();
    expect(s.perm("card").topCard?.cardId).toBe("BT13-092");
  });
});
