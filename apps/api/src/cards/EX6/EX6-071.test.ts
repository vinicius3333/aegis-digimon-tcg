import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-071.js";

describe("EX6-071 Pandemonium Lost", () => {
  it("keeps the five-card hand trash conditional but always executes the Then deletion", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "Trash", chooser: "opponent", condition: { kind: "zoneCount", value: 5 } },
      {
        kind: "Delete",
        target: {
          filter: {
            levelComparison: {
              op: "gte",
              scaling: { filter: { zone: "hand", controller: "opponent" }, unit: "cards", levelCeilingAdd: 1 },
            },
          },
        },
      },
    ]);
    expect(text).toContain("ActivateMain");
  });
  it("publicly trashes an opponent hand card and then deletes a Digimon at the post-trash level bound", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-046", as: "purple" }], hand: [{ card: "EX6-071", as: "option" }] },
        1: { hand: Array.from({ length: 5 }, () => "BT1-010"), battleArea: [{ card: "BT1-024", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.length === 4);
    expect(s.state.players[1]!.hand).toHaveLength(4);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
