import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-057.js";
import "./index.js";

describe("BT17-057 Chaosdramon", () => {
  it("deletes opposing Digimon up to a total play-cost budget of seven", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "DeleteBudget",
        filter: { controller: "opponent", kind: ["Digimon"] },
        budget: 7,
        upTo: true,
      });
    }
  });

  it("only prevents leaving caused by an opponent's effect", () => {
    const replacement = compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "byOpponentEffect",
      actions: [
        {
          kind: "Prevent",
          cost: {
            kind: "trash",
            target: { filter: { zone: "digivolutionCards", hostFilter: { isSelfRef: true } }, count: 2 },
          },
          optional: true,
        },
      ],
    });
  });

  it("places a qualifying trash card underneath before deleting within budget", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-057", as: "chaosdramon" }],
          trash: [{ card: "BT17-052", as: "placedSource" }],
        },
        1: {
          battleArea: [
            { card: "BT17-052", as: "costThree" },
            { card: "BT17-054", as: "costFour" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    const placedSourceId = s.inst("placedSource").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaosdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    const chaosdramon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT17-057")!;
    expect(chaosdramon.stack.at(0)?.instanceId).toBe(placedSourceId);
  });

  it("trashes two qualifying sources from itself to prevent opponent-effect deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-057", under: ["BT17-052", "BT17-056", "BT17-055"], as: "chaosdramon" }],
          hand: [{ card: "BT17-052", as: "unrelatedHandCard" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const chaosId = s.perm("chaosdramon").permanentId;
    const unrelatedId = s.inst("unrelatedHandCard").instanceId;

    await advance(s.engine).verb.deletePermanent([chaosId], "byEffect");
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === chaosId)).toBe(true);
    expect(s.perm("chaosdramon").stack.map((card) => card.cardId)).toEqual(["BT17-055"]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === unrelatedId)).toBe(true);
  });
});
