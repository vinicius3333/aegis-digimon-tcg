import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-011.js";
import "../index.js";

describe("BT16-011", () => {
  it("returns a red Digimon from trash and conditionally deletes an opposing Digimon at or below this DP", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Garudamon"], cost: 0, isAlternate: true }]);
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "Return", to: "hand", optional: true });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "Delete",
      condition: { kind: "selfDigivolutionStackHasTrait" },
      target: { filter: { dp: { op: "lte", relativeToSource: true } } },
    });
    expect(compiled.effects?.[0]?.actions[1]).not.toHaveProperty("optional");
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      condition: {
        filter: {
          nameOrTrait: [
            { tokens: ["Garudamon"], match: "name" },
            { tokens: ["X Antibody"], match: "trait" },
          ],
        },
      },
    });
  });
  it("gains Rush when a red card returns from trash and trashes opponent security on deletion", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenCardReturnsFromTrashToHand",
          actions: [{ kind: "GainKeyword", keyword: { keyword: "Rush" } }],
        },
      ],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" }],
    });
  });

  it("digivolves naturally, optionally returns a red Digimon, and deletes an opponent at or below its DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-022", as: "base" }],
          hand: [{ card: "BT16-011", as: "host" }],
          trash: [{ card: "BT1-009", as: "redCard" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "atLimit", dp: 8000 },
            { card: "BT1-009", as: "aboveLimit", dp: 10000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const atLimitId = s.perm("atLimit").permanentId;
    const aboveLimitId = s.perm("aboveLimit").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("redCard").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("redCard").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === atLimitId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === aboveLimitId)).toBe(true);
  });

  it("allows declining the optional return on a natural play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-011", as: "host" }], trash: [{ card: "BT1-009", as: "redCard" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("host").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-011"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("redCard").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("uses the X Antibody trait in a natural red evolution and keeps deletion mandatory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-064", as: "base", dp: 3000 }],
          hand: [{ card: "BT16-011", as: "garudamonX" }],
          trash: [{ card: "BT1-009", as: "redCard" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "atLimit", dp: 3000 },
            { card: "BT1-009", as: "aboveLimit", dp: 3001 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("garudamonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT16-011");

    expect(s.perm("base").stack.some((card) => card.cardId === "BT11-064")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("redCard").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
