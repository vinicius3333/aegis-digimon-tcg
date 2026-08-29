import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-015.js";

describe("BT22-015 Omnimon", () => {
  it("keeps Blocker, both Decode modes, lowest-DP deletion, stack-local scaling, and optional attack", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
    );
    expect(compiled.effects.filter((entry) => entry.trigger === "Static")).toHaveLength(3);
    const decodeReplacements = compiled.effects
      .filter((entry) => entry.trigger === "AllTurns")
      .flatMap((entry) => entry.actions)
      .filter((action) => action.kind === "Replacement");
    expect(decodeReplacements).toHaveLength(2);
    expect(decodeReplacements[0]).toMatchObject({
      event: "wouldLeavePlay",
      sourceFilter: { isSelfRef: true },
      leaveCause: "otherThanBattle",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["digivolutionCards"],
          payCost: false,
          playedByDecode: true,
          target: { filter: { kind: ["Digimon"], levels: [3], colors: ["Red", "Black"] }, count: 1 },
        },
      ],
    });
    expect(decodeReplacements[1]).toMatchObject({
      event: "wouldLeavePlay",
      sourceFilter: { isSelfRef: true },
      leaveCause: "otherThanBattle",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["digivolutionCards"],
          payCost: false,
          playedByDecode: true,
          target: { filter: { kind: ["Digimon"], levels: [3], colors: ["Blue", "Yellow"] }, count: 1 },
        },
      ],
    });
    const onPlay = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    const whenAttacking = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    expect(onPlay?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", superlative: "lowestDP" }, count: 1 },
    });
    expect(whenAttacking?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", superlative: "lowestDP" }, count: 1 },
    });
    const whenDigivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions[0]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
      scaling: { per: 1, unit: "sameLevelDigivolutionPairs" },
    });
    expect(whenDigivolving?.actions[1]).toMatchObject({ kind: "Attack", optional: true, withoutSuspending: false });
  });

  it("returns two Digimon for three level-4 and three level-5 stack cards, per Q4871", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT22-015",
              under: ["BT22-009", "BT22-009", "BT22-009", "BT22-011", "BT22-011", "BT22-011"],
              as: "omnimon",
            },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-011", as: "third" },
          ],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("omnimon"));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(2);
    expect(observe(s.engine).hasKeyword(s.perm("omnimon"), "Blocker")).toBe(true);
  });

  it("deletes exactly one lowest-DP opponent on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-015", as: "omnimon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 3000, as: "lowest" },
            { card: "BT22-010", dp: 5000, as: "higher" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("omnimon"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("higher").permanentId,
    ]);
  });
});
