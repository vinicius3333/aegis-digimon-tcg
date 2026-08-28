import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-076.js";
import "./index.js";

describe("BT17-076 Eosmon", () => {
  it("plays a level 5 or lower Eosmon from hand when digivolving or attacking", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          target: {
            filter: { levelComparison: { op: "lte", value: 5 }, nameOrTrait: [{ tokens: ["Eosmon"], match: "name" }] },
          },
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    });
  });

  it("deletes an opponent Digimon at or below the DP of the played Eosmon", () => {
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Eosmon"], match: "name" }] },
      actions: [
        { kind: "SelectBind", target: { sourceRef: "triggerSubject", bindAs: "playedEosmon" } },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              relativeTo: { attr: "dp", op: "lte", selectionRef: "playedEosmon" },
            },
            count: 1,
          },
        },
      ],
    });
  });

  it("scales all Eosmon DP by the number of Tamers on your turn", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: { count: "all", filter: { nameOrTrait: [{ tokens: ["Eosmon"], match: "name" }] } },
          effect: { kind: "modifyDP", amount: 1000 },
          scaling: { unit: "cards", per: 1, filter: { kind: ["Tamer"] } },
        },
      ],
    });
    expect(compiled.effects?.[3]?.actions?.[0]?.scaling?.filter).not.toHaveProperty("controllerDefault");
  });

  it("deletes by the played Eosmon's DP and counts both players' Tamers for DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-076", as: "eosmon" },
            { card: "BT17-087", as: "ownTamer" },
          ],
          hand: [{ card: "BT17-075", as: "playedEosmon" }],
        },
        1: {
          battleArea: [
            { card: "BT17-088", as: "opposingTamer" },
            { card: "BT17-063", dp: 6000, as: "target" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    const targetId = s.perm("target").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedEosmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
  });
});
