import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_075 } from "./BT24-075.js";
import "../index.js";

describe("BT24-075 SkullBaluchimon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-075")).toMatchObject({
      cardId: "BT24-075",
      nameEn: "SkullBaluchimon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 6,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Undead", "X Antibody", "Titan", "TS"],
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
    });
  });

  it("requires the hand-trash cost before deleting both level targets", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = BT24_075.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "Delete",
        cost: { kind: "trash", target: { filter: { zone: "hand" } } },
        optional: true,
        abortOnDecline: true,
      });
      expect(actions[0]).toMatchObject({ target: { filter: { levels: [3] }, count: 1 } });
      expect(actions[1]).toMatchObject({ kind: "Delete", target: { filter: { levels: [4] }, count: 1 } });
    }
    const inherited = BT24_075.effects?.find((entry) => entry.trigger === "YourTurn");
    expect(inherited?.actions?.[0]).toMatchObject({
      while: {
        kind: "anyOf",
        conditions: expect.arrayContaining([{ kind: "selfHasName", names: ["Titamon"] }]),
      },
      effect: { kind: "keyword" },
    });
  });

  it("public play pays 6 and one hand card to delete exactly one level 3 and one level 4", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-075", as: "skullbaluchimon" },
            { card: "BT1-001", as: "cost" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3" },
            { card: "BT1-014", as: "level4" },
            { card: "BT24-072", as: "level5" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const level3Id = s.perm("level3").permanentId;
    const level4Id = s.perm("level4").permanentId;
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skullbaluchimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === level4Id));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(level3Id);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("level5").permanentId,
    );
  });

  it.each([
    ["normal purple level-4 requirement", "BT24-070", undefined],
    ["alternate Demon requirement without matching color", "BT1-069", 0],
    ["alternate TS requirement without matching color", "BT24-010", 0],
  ])("uses the %s for cost 3", async (_label, baseCard, alternateRequirementIndex) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [
            { card: "BT24-075", as: "skullbaluchimon" },
            { card: "BT1-001", as: "cost" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3" },
            { card: "BT1-014", as: "level4" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const level4Id = s.perm("level4").permanentId;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("skullbaluchimon").instanceId,
        ...(alternateRequirementIndex === undefined ? {} : { alternateRequirementIndex }),
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === level4Id));

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("skullbaluchimon").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "pays one hand card to delete one level 3 and one level 4 on %s",
    async (timing) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT24-075", as: "skullbaluchimon" }],
            hand: [{ card: "BT1-001", as: "cost" }],
          },
          1: {
            battleArea: [
              { card: "BT1-009", as: "level3" },
              { card: "BT1-014", as: "level4" },
              { card: "BT24-072", as: "level5" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const level3Id = s.perm("level3").permanentId;
      const level4Id = s.perm("level4").permanentId;
      await s.ready();

      await advance(s.engine).fire(timing, s.perm("skullbaluchimon"));

      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(level3Id);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(level4Id);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
        s.perm("level5").permanentId,
      );
    },
  );

  it("deletes neither target when the hand-trash cost cannot be paid", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-075", as: "skullbaluchimon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3" },
            { card: "BT1-014", as: "level4" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("skullbaluchimon"));

    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it.each([
    ["exact Titamon name", "BT1-080"],
    ["Titan trait", "BT24-013"],
  ])("inherited effect grants Security Attack +1 for the %s alternative", async (_label, topCard) => {
    const s = setupEngine({ 0: { battleArea: [{ card: topCard, as: "host", under: ["BT24-075"] }] } });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });
});
