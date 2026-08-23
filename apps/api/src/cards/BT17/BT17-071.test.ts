import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-071.js";
import "./index.js";

describe("BT17-071 Ornismon", () => {
  it("limits the Darcmon evolution route to a base with HippoGryphonmon underneath", () => {
    expect(compiled.digivolutionRequirement).toContainEqual({
      names: ["Darcmon"],
      minNameStackCount: 1,
      minNameStackNames: ["HippoGryphonmon"],
      cost: 4,
      isAlternate: true,
    });
  });

  it("requires both stack names before playing Ornismon after deleting another Digimon", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0];
    expect(action).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      condition: {
        kind: "selfDigivolutionStackHasTrait",
        filter: { nameOrTrait: [{ tokens: ["Darcmon", "HippoGryphonmon"], match: "name" }] },
      },
      cost: { kind: "deleteOwn", target: { filter: { controller: "mine", excludeSelf: true }, count: 1 } },
    });
  });

  it("deletes an opposing Digimon no higher than the Digimon deleted by the trigger", () => {
    const action = compiled.effects.find((entry) => entry.frequency === "OncePerTurn")?.actions[0];
    expect(action).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: { controller: "mine", excludeSelf: true },
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", levelComparison: { op: "lte", relativeTo: "lastDeleted" } },
            count: 1,
          },
        },
      ],
    });
  });

  it("deletes an opposing Digimon after another level-5 Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-071", as: "murmukusmon" },
            { card: "BT17-066", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT17-063", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;

    await advance(s.engine).verb.deletePermanent([s.perm("ally").permanentId], "byEffect");
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));

    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT17-063")).toBe(true);
  });
});
