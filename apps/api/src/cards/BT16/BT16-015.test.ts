import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-015.js";
import "../index.js";

describe("BT16-015", () => {
  it("grants Blitz and a conditional end-of-attack deletion effect when Phoenixmon/X Antibody is stacked", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blitz" },
      duration: "forTheTurn",
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "GrantStatic",
      condition: { kind: "selfDigivolutionStackHasTrait" },
    });
  });
  it("on deletion may play a qualifying red Digimon and delete an opposing Digimon within its DP", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, bindResultAs: "playedDigimon" },
        { kind: "Delete", target: { filter: { dp: { valueFrom: "playedDigimon" } } } },
      ],
    }));

  it("plays a qualifying red Avian from hand on deletion, then deletes within its DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-015", as: "phoenixmonX" }],
          hand: [{ card: "BT16-008", as: "playedAvian" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "withinPlayedDP", dp: 4000 },
            { card: "BT1-009", as: "abovePlayedDP", dp: 5000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("phoenixmonX").permanentId;
    const withinId = s.perm("withinPlayedDP").permanentId;
    const aboveId = s.perm("abovePlayedDP").permanentId;

    await advance(s.engine).verb.deletePermanent([hostId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-008"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-008")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === withinId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === aboveId)).toBe(true);
  });
});
