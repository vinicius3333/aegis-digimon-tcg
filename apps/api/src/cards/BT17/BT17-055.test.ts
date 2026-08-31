import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-055.js";
import "./index.js";

describe("BT17-055 Infermon", () => {
  it("de-digivolves any opposing Digimon, then restricts an opposing cost-8-or-lower Digimon from attacking players", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 1,
      stopAtLevel: 3,
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(effect?.actions[1]).toMatchObject({
      kind: "Restrict",
      restriction: "attackPlayers",
      duration: "untilOpponentTurnEnd",
      target: { filter: { controller: "opponent", playCostLte: 8 }, count: 1 },
    });
  });

  it("triggers once per turn only when another named Diaboromon is played", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Diaboromon"], match: "name" }],
          },
        },
      ],
    });
  });

  it("de-digivolves one opponent and restricts a cost-8 target on digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-054", as: "base" }],
          hand: [{ card: "BT17-055", as: "infermon" }],
        },
        1: {
          battleArea: [{ card: "BT4-035", under: ["BT17-025"], as: "restricted" }],
          hand: [{ card: "BT4-035", as: "upgraded" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const removedTopId = s.perm("restricted").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("infermon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === removedTopId));

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === removedTopId)).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "attackPlayers")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("restricted").permanentId,
        instanceId: s.inst("upgraded").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("restricted").topCard?.cardId === "BT4-035");

    expect(observe(s.engine).isRestricted(s.perm("restricted"), "attackPlayers")).toBe(true);
  });

  it("inherits de-digivolution when another Diaboromon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-057", under: ["BT17-055"], as: "host" }],
          hand: [{ card: "BT17-059", as: "playedDiaboromon" }],
        },
        1: { battleArea: [{ card: "BT4-035", under: ["BT17-025"], as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const removedTopId = s.perm("target").topCard!.instanceId;
    s.state.memory = 12;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("playedDiaboromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === removedTopId));

    expect(s.perm("target").topCard?.cardId).toBe("BT17-025");
  });
});
