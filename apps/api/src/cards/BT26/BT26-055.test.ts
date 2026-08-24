import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-055.js";
import "../index.js";

describe("BT26-055 Giromon", () => {
  it("shares the Once Per Turn body across play, digivolution, and Counter and inherits security trash", () => {
    expect(digivolutionRequirementsFor("BT26-055")).toContainEqual({
      level: 4,
      traits: ["DM"],
      cost: 3,
      isAlternate: true,
    });
    expect(compiled.effects?.slice(1, 4).map((effect) => effect.sharedUseKey)).toEqual([
      "bt26-055-place-delete",
      "bt26-055-place-delete",
      "bt26-055-place-delete",
    ]);
    expect(compiled.effects?.[0]?.keywords).toContainEqual(expect.objectContaining({ keyword: "Fragment", amount: 2 }));
    expect(compiled.effects?.[1]?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "SelectBind", optional: true, abortOnDecline: true }),
        expect.objectContaining({ kind: "Delete", target: { filter: { boundRef: "ownVer3ToDelete" }, count: 1 } }),
        expect.objectContaining({
          kind: "Delete",
          target: { filter: expect.objectContaining({ lowestPlayCost: true }), count: "all" },
        }),
      ]),
    );
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        { kind: "SubTrigger", event: "whenLeavesPlay", actions: [{ kind: "SecurityManipulation", op: "trashTop" }] },
      ],
    });
  });

  it("publicly trashes the opponent's top security when the inherited source leaves play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "BT26-055", as: "giromon" }] }] },
      1: { security: [{ card: "BT1-001", as: "security" }] },
    });
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("requires choosing an own Ver.3 Digimon before deleting all opposing lowest-play-cost Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-055", as: "giromon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowA" },
            { card: "BT1-009", as: "lowB" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("giromon"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual([]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual([]);
  });

  it("doesn't delete opposing Digimon when the combined deletion is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-055", as: "giromon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("giromon"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-055");
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT1-010");
  });
});
