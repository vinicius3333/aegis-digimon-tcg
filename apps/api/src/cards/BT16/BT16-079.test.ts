import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-079.js";
import "../index.js";

describe("BT16-079", () => {
  it("models Alliance", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Alliance" }] });
  });

  it("once per turn plays a yellow or green level 4 or lower from hand or trash at both timings", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [{ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    });
  });

  it("deletes an opposing level 4 or lower Digimon per other Digimon when Cherubimon or X Antibody is underneath", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Delete",
          optional: true,
          condition: { kind: "selfDigivolutionStackHasTrait" },
          target: { filter: { levelComparison: { op: "lte", value: 4, scaling: { unit: "cards" } } } },
        },
      ],
    });
  });

  it("deletes an opposing level 6 Digimon with two other Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-079", as: "cherubimonX", under: ["BT26-078"] },
            { card: "BT16-042", as: "otherOne" },
            { card: "BT16-042", as: "otherTwo" },
          ],
        },
        1: { battleArea: [{ card: "BT16-079", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).runTurn(0);

    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId),
    ).toBe(false);
  });
});
