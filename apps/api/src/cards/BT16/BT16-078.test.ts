import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-078.js";
import "../index.js";

describe("BT16-078", () => {
  it("deletes a level 4 or lower Digimon on play or digivolution", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 4 } } } }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 4 } } } }],
    });
  });

  it("allows either player's level 4 or lower Digimon as the deletion target", () => {
    expect(compiled.effects?.[0]).not.toMatchObject({
      actions: [{ target: { filter: { controllerDefault: "opponent" } } }],
    });
    expect(compiled.effects?.[1]).not.toMatchObject({
      actions: [{ target: { filter: { controllerDefault: "opponent" } } }],
    });
  });

  it("plays an Undead or Dark Animal level 5 or lower from trash after another of yours is deleted", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }],
        },
      ],
    });
  });

  it("watches deletion of another Digimon regardless of controller", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      actions: [{ kind: "SubTrigger", sourceFilter: { excludeSelf: true, kind: ["Digimon"] } }],
    });
    expect(compiled.effects?.[2]?.actions?.[0]).not.toMatchObject({ sourceFilter: { controllerDefault: "mine" } });
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({ sourceFilter: { deleteCause: "byEffect" } });
  });

  it("can delete your own low-level Digimon and react to that effect deletion", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-078", as: "pharaohmon" }],
          battleArea: [{ card: "BT1-011", as: "victim" }],
          trash: [{ card: "BT16-073", as: "undead" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    const victimId = s.perm("victim").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pharaohmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-073"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === victimId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-073")).toBe(true);
  });
});

describe("BT16-078 Pharaohmon — KB Q&A rulings", () => {
  it("must delete your own level 4 or lower Digimon when it is the only candidate (Q2665)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-078", as: "pharaohmon" }],
          battleArea: [
            { card: "BT1-014", as: "ownLevel4" },
            { card: "BT1-020", as: "ownLevel5" },
          ],
        },
        1: { battleArea: [{ card: "BT1-024", as: "opponentLevel5" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    const ownLevel4Id = s.perm("ownLevel4").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pharaohmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-078"));
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === ownLevel4Id));

    const pharaohmonId = s.inst("pharaohmon").instanceId;
    const pharaohmonDecisions = s.decisions.filter(({ req }) => req.sourceInstanceId === pharaohmonId);
    expect(pharaohmonDecisions.some(({ req }) => req.kind === "optional")).toBe(false);
    const skippableTargetSelections = pharaohmonDecisions.filter(
      ({ req }) => (req.kind === "selectCards" || req.kind === "chooseTargets") && (req.options?.min ?? 1) === 0,
    );
    expect(skippableTargetSelections).toEqual([]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-014");
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(
      expect.arrayContaining(["BT16-078", "BT1-020"]),
    );
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-024"]);
  });
});
