import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type SetupEngineOptions } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-076.js";
import "./index.js";
import "../BT6/BT6-083.js";

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
            filter: {
              levelComparison: { op: "lte", value: 5 },
              nameOrTrait: [{ tokens: ["Eosmon"], match: "nameExact" }],
            },
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
      sourceFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Eosmon"], match: "nameExact" }] },
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
          target: { count: "all", filter: { nameOrTrait: [{ tokens: ["Eosmon"], match: "nameExact" }] } },
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

  it("boosts your Eosmon by an opponent-only Tamer on your turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-076", as: "eosmon" }] },
      1: { battleArea: [{ card: "BT17-088", as: "opposingTamer" }] },
    });
    s.state.turnSeat = 0;
    await s.ready();

    expect(s.perm("eosmon").currentDP).toBe(13000);
  });

  it("triggers its own [All Turns] deletion when this Eosmon is played (Q2844)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-076", as: "self" },
            { card: "BT1-010", as: "spare" },
          ],
        },
        1: { battleArea: [{ card: "BT17-063", dp: 6000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("self").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((c) => c.instanceId === s.inst("target").instanceId));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT17-076")).toBe(true);
    expect(s.state.players[1]!.trash.some((c) => c.instanceId === s.inst("target").instanceId)).toBe(true);
  });

  it("digivolves from a Lv5 [Eosmon], paying 4 and taking the digivolution draw", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-075", as: "base" }],
          hand: [{ card: "BT17-076", as: "evolving" }],
          deck: [{ card: "BT1-010", as: "drawn" }, { card: "BT1-009" }],
        },
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
    await settle(() => s.perm("base").topCard.cardId === "BT17-076");

    expect(s.perm("base").topCard.cardId).toBe("BT17-076");
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("refuses a wrong-level Eosmon and a right-level non-Eosmon source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-074", as: "lowEosmon" },
            { card: "BT1-024", as: "wrongName" },
          ],
          hand: [{ card: "BT17-076", as: "evolving" }],
          deck: [{ card: "BT1-010" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const evolvingId = s.inst("evolving").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lowEosmon").permanentId,
        instanceId: evolvingId,
      }),
    ).not.toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongName").permanentId,
        instanceId: evolvingId,
      }),
    ).not.toEqual({ ok: true });
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === evolvingId)).toBe(true);
  });

  it("deletes only one opponent Digimon per turn across two Eosmon plays", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-076", as: "eosmon" }],
          hand: [
            { card: "BT17-074", as: "first" },
            { card: "BT17-074", as: "second" },
            { card: "BT1-010", as: "spare" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT17-063", dp: 3000, as: "t1" },
            { card: "BT17-063", dp: 3000, as: "t2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    expect(s.state.players[1]!.battleArea.length).toBe(1);
  });
});

describe("BT17-076 Eosmon — KB Q&A rulings", () => {
  function boardWithPlayableBt6Eosmon(targetDp: number, options: SetupEngineOptions) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-076", as: "eosmon" }],
          hand: [
            { card: "BT6-083", as: "playedEosmon" },
            { card: "BT16-090", as: "whiteTamer" },
          ],
        },
        1: { battleArea: [{ card: "BT17-063", dp: targetDp, as: "target" }] },
      },
      { autoSelectCards: true, ...options },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    return s;
  }

  it("deletes by the played BT6-083 Eosmon's DP at resolution, after its simultaneous [On Play] raised it to 5000 (Q2845)", async () => {
    async function playBt6EosmonResolvingFirst(firstTrigger: string) {
      const s = boardWithPlayableBt6Eosmon(5000, { autoAcceptOptional: true, preferTriggerKeys: [firstTrigger] });
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedEosmon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT16-090"));
      await settle();
      return s;
    }

    const tamerFirst = await playBt6EosmonResolvingFirst("BT6-083");
    expect(tamerFirst.perm("playedEosmon").currentDP).toBe(5000);
    expect(tamerFirst.state.players[1]!.trash.map((card) => card.instanceId)).toContain(
      tamerFirst.inst("target").instanceId,
    );

    const deletionFirst = await playBt6EosmonResolvingFirst("BT17-076");
    expect(deletionFirst.perm("playedEosmon").currentDP).toBe(5000);
    expect(deletionFirst.perm("target").topCard.cardId).toBe("BT17-063");
  });

  it("deletes nothing when the played Eosmon left the battle area before this effect resolved (Q2846)", async () => {
    async function playBt6EosmonAndResolve(removeBeforeDeletion: boolean) {
      const s = boardWithPlayableBt6Eosmon(3000, { preferTriggerKeys: ["BT6-083"] });
      await s.ready();
      const playedEosmonId = s.inst("playedEosmon").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: playedEosmonId })).toEqual({ ok: true });
      await settle(() => s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "BT6-083"));
      const onPlayPrompt = s.decisions.find(({ req }) => req.kind === "optional" && req.sourceCardId === "BT6-083")!;

      // The other simultaneous effect is resolving: remove the played Eosmon before BT17-076 resolves.
      if (removeBeforeDeletion) await advance(s.engine).verb.returnToHand([playedEosmonId]);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: onPlayPrompt.req.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
      await settle();
      return s;
    }

    const removed = await playBt6EosmonAndResolve(true);
    expect(removed.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT6-083");
    expect(removed.perm("target").topCard.cardId).toBe("BT17-063");

    const stayed = await playBt6EosmonAndResolve(false);
    expect(stayed.state.players[1]!.trash.map((card) => card.instanceId)).toContain(stayed.inst("target").instanceId);
  });
});
