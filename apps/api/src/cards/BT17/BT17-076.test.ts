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
          scaling: { unit: "cards", per: 1, filter: { controller: "any", kind: ["Tamer"] } },
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
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedEosmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
    expect(s.perm("eosmon").currentDP).toBe(14000);
  });

  it("plays Eosmon from hand on a natural digivolution and resolves its played-DP deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-075", as: "base" }],
          hand: [
            { card: "BT17-076", as: "evolving" },
            { card: "BT17-075", as: "playedEosmon" },
          ],
        },
        1: { battleArea: [{ card: "BT17-063", dp: 6000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("target").instanceId));

    expect(s.perm("base").topCard.cardId).toBe("BT17-076");
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("playedEosmon").instanceId)).toBe(
      true,
    );
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(true);
  });

  it("plays Eosmon from hand when attacking and shares its once-per-turn limit", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-076", as: "attacker" }],
          hand: [{ card: "BT17-075", as: "playedEosmon" }],
        },
        1: { security: ["BT1-101"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("playedEosmon").instanceId)).toBe(
      true,
    );
  });
});
