import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
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
          battleArea: [
            { card: "BT4-035", under: ["BT17-025"], as: "stacked" },
            { card: "BT17-025", as: "restricted" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const removedTopId = s.perm("stacked").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("infermon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === removedTopId));

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === removedTopId)).toBe(true);
  });

  it("inherits de-digivolution when another Diaboromon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-057", under: ["BT17-055"], as: "host" },
            { card: "BT17-059", as: "playedDiaboromon" },
          ],
        },
        1: { battleArea: [{ card: "BT4-035", under: ["BT17-025"], as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const removedTopId = s.perm("target").topCard!.instanceId;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("playedDiaboromon").permanentId,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === removedTopId));

    expect(s.perm("target").topCard?.cardId).toBe("BT17-025");
  });
});
