import { describe, expect, it } from "vitest";
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

  it("requires a named level-5 Cyborg material and grants trash DigiXros with a black Tamer", () => {
    expect(compiled.digiXrosRequirement).toEqual([
      {
        materials: [{ names: ["Machinedramon"], traits: ["Cyborg"] }],
        count: 1,
      },
    ]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "GrantStatic",
          grant: "digixrosFromTrash",
          condition: { kind: "youHave", filter: { kind: ["Tamer"], colors: ["Black"] } },
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
            { card: "BT17-054", as: "costFive" },
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
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    const chaosdramon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT17-057")!;
    expect(chaosdramon.stack.at(0)?.instanceId).toBe(placedSourceId);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-054")).toBe(true);
  });

  it("trashes two qualifying sources from itself to prevent opponent-effect deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-057", under: ["BT17-052", "BT17-054", "BT17-055"], as: "chaosdramon" }],
          hand: [{ card: "BT17-052", as: "unrelatedHandCard" }],
        },
        1: { hand: [{ card: "BT17-072", as: "opponentDeleter" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const chaosId = s.perm("chaosdramon").permanentId;
    const unrelatedId = s.inst("unrelatedHandCard").instanceId;

    s.state.memory = 13;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentDeleter").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("chaosdramon").stack.length === 1);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === chaosId)).toBe(true);
    expect(s.perm("chaosdramon").stack.map((card) => card.cardId)).toEqual(["BT17-055"]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === unrelatedId)).toBe(true);
  });
});
