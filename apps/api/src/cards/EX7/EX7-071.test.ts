import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-071.js";
import "../index.js";

describe("EX7-071 Hurricane Screw Shot", () => {
  it("gains 1 memory when this digivolution card is discarded and waives color with a Three Musketeers Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Static" && entry.isInherited)?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "onDigivolutionCardDiscarded",
        requireByEffect: true,
        actions: [{ kind: "GainMemory", amount: 1 }],
      },
    ]));
  it("keeps the color waiver independent of the inherited stack trigger", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Static" && !entry.isInherited)?.actions).toMatchObject([
      { kind: "WaiveColorRequirement", condition: { kind: "youHave" } },
    ]));
  it("marks the stack trigger as inherited so it can resolve from under a Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Static" && entry.isInherited)).toMatchObject({
      actions: [{ kind: "SubTrigger", event: "onDigivolutionCardDiscarded" }],
    }));
  it("deletes opposing level 3, 4, and 5 Digimon and then places itself under a Three Musketeers Digimon", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions ?? [];
    expect(actions).toHaveLength(4);
    expect(actions.slice(0, 3).map((action) => action.kind)).toEqual(["Delete", "Delete", "Delete"]);
    expect(actions[3]).toMatchObject({ kind: "PlaceUnder" });
  });

  it("deletes one opposing level 3, 4, and 5 Digimon, then places itself under a Three Musketeers Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX7-071", as: "hurricane" }], battleArea: [{ card: "EX7-059", as: "musketeer" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "levelThree" },
            { card: "BT1-014", as: "levelFour" },
            { card: "BT1-038", as: "levelFive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hurricane").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([]);
    expect(s.perm("musketeer").stack.map((card) => card.instanceId)).toContain(s.inst("hurricane").instanceId);
  });

  it("gains memory when an effect trashes this card from a digivolution stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX7-071", as: "hurricane" }] }] },
    });
    s.state.memory = 0;
    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      [s.inst("hurricane").instanceId],
      0,
    );
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("deletes opposing level 3, 4, and 5 Digimon when revealed as Security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "EX7-071", as: "hurricane" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "levelThree" },
            { card: "BT1-014", as: "levelFour" },
            { card: "BT1-038", as: "levelFive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("hurricane"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
