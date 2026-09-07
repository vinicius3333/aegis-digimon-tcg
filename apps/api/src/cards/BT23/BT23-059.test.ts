import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-059.js";

/**
 * Board Spec used by the behavioral runs. Seat 0 holds Justimon: Blitz Arm plus a
 * BT23-100 Hudie Net Cafe in hand; playing that Option publicly places it in the battle
 * area by its own [Main] effect, which is the only legal way to have a battle-area Option
 * to pay the trash cost with (Q5323).
 */
function playHudieNetCafe(s: EngineSetup, alias: string): string {
  const optionId = s.inst(alias).instanceId;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
  return optionId;
}

function optionIsOnBoard(s: EngineSetup, seat: 0 | 1, optionId: string): boolean {
  return s.state.players[seat]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId);
}

/** Non-throwing permanent lookup by top-card instance id, safe inside a `settle` predicate. */
function permanentWithTopCard(s: EngineSetup, seat: 0 | 1, instanceId: string) {
  return s.state.players[seat]!.battleArea.find((permanent) => permanent.topCard?.instanceId === instanceId);
}

describe("BT23-059 Justimon: Blitz Arm", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-059")).toMatchObject({
      cardId: "BT23-059",
      nameEn: "Justimon: Blitz Arm",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Cyborg", "Hudie", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Justimon: Accel Arm", "Justimon: Critical Arm"], cost: 1, isAlternate: true },
      { level: 5, traits: ["CS"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("optionally processes the cost to trash an Option and delete the opponent's lowest-play-cost Digimon", () => {
    const sharedKeys = new Set<string>();
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const effect = irNode(compiled.effects.find((entry) => entry.trigger === trigger));
      const action = effect.actions[0];
      expect(effect.frequency).toBe("OncePerTurn");
      sharedKeys.add(effect.sharedUseKey);
      expect(action).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestPlayCost" }, count: 1 },
        cost: {
          kind: "trash",
          target: {
            filter: { zone: "battleArea", kind: ["Option"], placedInBattleAreaByEffect: true },
            count: 1,
          },
        },
        abortOnDecline: true,
      });
      expect(action.optional).toBe(true);
      // The printed text says "in the battle area", not "in your battle area": the cost
      // filter must not carry a controller restriction.
      expect(action.cost.target.filter.controller).toBeUndefined();
    }
    // One printed [Once Per Turn] shared by the three windows, not three independent uses.
    expect(sharedKeys.size).toBe(1);
  });

  it("once per turn unsuspends and protects itself when an Option in the battle area is trashed", () => {
    const effect = irNode(compiled.effects.find((entry) => entry.trigger === "AllTurns"));
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOptionInBattleAreaTrashed",
      actions: [
        { kind: "Unsuspend", target: { filter: { isSelfRef: true }, isSelf: true } },
        { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", duration: "forTheTurn" },
      ],
    });
  });

  it("exposes Blocker through the live keyword seam and blocks a real attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "attacker" }],
        deck: ["BT1-010", "BT1-011"],
      },
      1: {
        battleArea: [{ card: "BT23-059", as: "justimon" }],
        security: ["BT1-011", "BT1-012"],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("justimon"), "Blocker")).toBe(true);
    const attackerCardId = s.perm("attacker").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("justimon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    // The blocker fought instead of security: the 3000 DP attacker dies, security is untouched.
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === attackerCardId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("justimon").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves for 1 from either named Justimon, for 3 from an off-colour Lv.5 CS and from a Black Lv.5", async () => {
    const routes: { base: string; cost: number; alternate: boolean }[] = [
      { base: "BT11-073", cost: 1, alternate: true },
      { base: "BT10-067", cost: 1, alternate: true },
      { base: "BT23-044", cost: 3, alternate: true },
      { base: "BT10-064", cost: 3, alternate: false },
    ];
    for (const route of routes) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: route.base, as: "base" }],
          hand: [{ card: "BT23-059", as: "blitz" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      });
      s.state.memory = 6;
      await s.ready();
      const blitzId = s.inst("blitz").instanceId;
      const baseCardId = s.perm("base").topCard!.instanceId;
      const handBefore = s.state.players[0]!.hand.length;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: blitzId,
          ...(route.alternate ? { useAlternateCost: true } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => permanentWithTopCard(s, 0, blitzId) !== undefined);
      expect(s.state.memory).toBe(6 - route.cost);
      // Source-stack identity: the base card is now the digivolution card under Blitz Arm.
      expect(s.perm("blitz").topCard!.instanceId).toBe(blitzId);
      expect(s.perm("blitz").stack.map((card) => card.instanceId)).toEqual([baseCardId]);
      // Digivolving draws 1 and the hand loses Blitz Arm: net unchanged.
      expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    }
  });

  it("refuses an illegal source", async () => {
    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "BT1-039", as: "base" }],
        hand: [{ card: "BT23-059", as: "blitz" }],
        deck: ["BT1-009"],
      },
    });
    illegal.state.memory = 6;
    await illegal.ready();
    // BT1-039 Cerberusmon is a Blue Lv.5 with no [CS] trait and neither Justimon name, so it
    // satisfies neither the printed Black Lv.5 evoCost nor either alternate requirement.
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("blitz").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(illegal.state.memory).toBe(6);
    expect(illegal.state.players[0]!.hand).toHaveLength(1);

    // The alternate routes are also taken WITHOUT the flag when they are the only match
    // (apps/api/src/engine/actions/digivolve.ts "when only one path matches, that path is
    // always used"), so the flag cannot change the cost for this card: BT10-067 costs 1 either
    // way, and no source matches both a printed evoCost and an alternate route.
    const noFlag = setupEngine({
      0: {
        battleArea: [{ card: "BT10-067", as: "base" }],
        hand: [{ card: "BT23-059", as: "blitz" }],
        deck: ["BT1-009"],
      },
    });
    noFlag.state.memory = 6;
    await noFlag.ready();
    const blitzId = noFlag.inst("blitz").instanceId;
    expect(
      noFlag.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: noFlag.perm("base").permanentId,
        instanceId: blitzId,
      }),
    ).toEqual({ ok: true });
    await settle(() => permanentWithTopCard(noFlag, 0, blitzId) !== undefined);
    expect(noFlag.state.memory).toBe(5);
  });

  it("trashes the publicly placed Option when digivolving and deletes the lowest-play-cost opponent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-044", as: "lilamon" }],
          hand: [
            { card: "BT23-100", as: "cafe" },
            { card: "BT23-059", as: "blitz" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "cheap" },
            { card: "BT1-024", as: "expensive" },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 9;
    await s.ready();
    const cafeId = playHudieNetCafe(s, "cafe");
    await settle(() => optionIsOnBoard(s, 0, cafeId));
    expect(optionIsOnBoard(s, 0, cafeId)).toBe(true);
    expect(s.state.memory).toBe(6);

    const cheapPermanentId = s.perm("cheap").permanentId;
    const cheapCardId = s.perm("cheap").topCard!.instanceId;
    const expensiveCardId = s.perm("expensive").topCard!.instanceId;
    const blitzId = s.inst("blitz").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lilamon").permanentId,
        instanceId: blitzId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === cheapPermanentId) &&
        s.state.players[0]!.trash.some((card) => card.instanceId === cafeId),
    );

    expect(s.state.memory).toBe(3);
    // Cost: the battle-area Option left the board for the trash.
    expect(optionIsOnBoard(s, 0, cafeId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === cafeId)).toBe(true);
    // Effect: only the cost-2 Monodramon died; the cost-7 MetalTyrannomon stayed.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([expensiveCardId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([cheapCardId]);
    // [All Turns] rider: the trashed Option granted opponent-Digimon-effect immunity.
    expect(observe(s.engine).isRestrictedByEffect(s.perm("blitz"), "beAffected", "Digimon")).toBe(true);
    expect(s.perm("blitz").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declining the optional cost leaves the Option, the opponent and the immunity untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-044", as: "lilamon" }],
          hand: [
            { card: "BT23-100", as: "cafe" },
            { card: "BT23-059", as: "blitz" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "cheap" }],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 9;
    await s.ready();
    const cafeId = playHudieNetCafe(s, "cafe");
    await settle(() => optionIsOnBoard(s, 0, cafeId));
    const cheapPermanentId = s.perm("cheap").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lilamon").permanentId,
        instanceId: s.inst("blitz").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined && permanentWithTopCard(s, 0, s.inst("blitz").instanceId) !== undefined,
    );

    expect(optionIsOnBoard(s, 0, cafeId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === cafeId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === cheapPermanentId)).toBe(true);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("blitz"), "beAffected", "Digimon")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does nothing when no Option is in the battle area to pay the cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-044", as: "lilamon" }],
          hand: [
            { card: "BT23-059", as: "blitz" },
            { card: "BT23-100", as: "cafeInHand" },
          ],
          trash: [{ card: "BT23-100", as: "cafeInTrash" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "cheap" }],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 9;
    await s.ready();
    const cheapPermanentId = s.perm("cheap").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lilamon").permanentId,
        instanceId: s.inst("blitz").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined && permanentWithTopCard(s, 0, s.inst("blitz").instanceId) !== undefined,
    );

    // An Option in hand or trash is not "in the battle area" and cannot pay the cost.
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cafeInHand").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cafeInTrash").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === cheapPermanentId)).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("blitz"), "beAffected", "Digimon")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("accepts an Option in the OPPONENT's battle area as the trash cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-044", as: "lilamon" }],
          hand: [{ card: "BT23-059", as: "blitz" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "cheap" }],
          hand: [{ card: "BT23-100", as: "theirCafe" }],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 9;
    await s.ready();
    // No public intent puts an Option into the OPPONENT's battle area during seat 0's turn,
    // so the production placement verb stands in for their own earlier [Main] placement.
    const theirCafeId = s.inst("theirCafe").instanceId;
    await advance(s.engine).verb.placeOptionAsPermanent(theirCafeId);
    expect(optionIsOnBoard(s, 1, theirCafeId)).toBe(true);

    const cheapPermanentId = s.perm("cheap").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lilamon").permanentId,
        instanceId: s.inst("blitz").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === cheapPermanentId));

    expect(optionIsOnBoard(s, 1, theirCafeId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === theirCafeId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("blitz"), "beAffected", "Digimon")).toBe(true);
  });

  it("unsuspends itself mid-attack when its When Attacking effect trashes the Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-059", as: "blitz" }],
          hand: [{ card: "BT23-100", as: "cafe" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "cheap" }],
          security: ["BT1-011", "BT1-012"],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const cafeId = playHudieNetCafe(s, "cafe");
    await settle(() => optionIsOnBoard(s, 0, cafeId));
    const cheapPermanentId = s.perm("cheap").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blitz").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === cafeId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === cheapPermanentId)).toBe(false);
    // Attacking suspended it; the [All Turns] rider unsuspended it again before the attack ended.
    expect(s.perm("blitz").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("blitz"), "beAffected", "Digimon")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("ignores an opponent Digimon's DP reduction once the Option trash grants immunity", async () => {
    const run = async (placeOption: boolean): Promise<{ dp: number; immune: boolean }> => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT23-059", as: "blitz" }],
            hand: [{ card: "BT23-100", as: "cafe" }],
            deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          },
          1: {
            // A deletion target so the When Attacking effect has somewhere to land; without
            // one the whole clause aborts and the Option is never trashed.
            battleArea: [{ card: "BT1-009", as: "cheap" }],
            security: [{ card: "BT23-028", as: "coordemon" }],
            deck: ["BT1-013", "BT1-014"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 6;
      await s.ready();
      if (placeOption) {
        const cafeId = playHudieNetCafe(s, "cafe");
        await settle(() => optionIsOnBoard(s, 0, cafeId));
      }
      const coordemonId = s.inst("coordemon").instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("blitz").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          !observe(s.engine).isAttacking() &&
          s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === coordemonId),
      );
      // Coordemon's Security effect replayed it, and its On Play -3000 DP resolved.
      expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === coordemonId)).toBe(
        true,
      );
      expect(s.state.pendingDecision).toBeUndefined();
      return {
        dp: s.perm("blitz").currentDP,
        immune: observe(s.engine).isRestrictedByEffect(s.perm("blitz"), "beAffected", "Digimon"),
      };
    };

    const withoutImmunity = await run(false);
    expect(withoutImmunity.immune).toBe(false);
    expect(withoutImmunity.dp).toBe(8000);

    const withImmunity = await run(true);
    expect(withImmunity.immune).toBe(true);
    expect(withImmunity.dp).toBe(11000);
  });

  it("uses the shared Once Per Turn only once a turn and resets it on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-059", as: "blitz" }],
          hand: [
            { card: "BT23-100", as: "cafeOne" },
            { card: "BT23-100", as: "cafeTwo" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "cheapOne" },
            { card: "BT1-010", as: "cheapTwo" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const attackPlayer = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blitz").permanentId,
        target: { kind: "player" },
      });

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;
    const cafeOneId = playHudieNetCafe(s, "cafeOne");
    await settle(() => optionIsOnBoard(s, 0, cafeOneId));
    const cafeTwoId = playHudieNetCafe(s, "cafeTwo");
    await settle(() => optionIsOnBoard(s, 0, cafeTwoId));
    const cheapOnePermanentId = s.perm("cheapOne").permanentId;
    const cheapTwoPermanentId = s.perm("cheapTwo").permanentId;

    // First window this turn: the shared Once Per Turn fires.
    expect(attackPlayer()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === cafeOneId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === cheapOnePermanentId)).toBe(
      false,
    );
    expect(optionIsOnBoard(s, 0, cafeTwoId)).toBe(true);

    // Second attack in the same turn: the shared use is spent, so nothing is trashed or deleted.
    expect(attackPlayer()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(optionIsOnBoard(s, 0, cafeTwoId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === cafeTwoId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === cheapTwoPermanentId)).toBe(
      true,
    );

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    // Next own turn: the use has reset and the second Option pays for a second delete.
    expect(attackPlayer()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === cafeTwoId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === cheapTwoPermanentId)).toBe(
      false,
    );

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("stays a choosable but unaffected target while the immunity is up (Q5325)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-059", as: "blitz" },
            { card: "BT1-010", as: "spare" },
          ],
          hand: [{ card: "BT23-100", as: "cafe" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "cheap" }],
          security: [{ card: "BT23-028", as: "coordemon" }],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 6;
    await s.ready();
    // Bias the opponent's "-3000 DP to 1 of your opponent's Digimon" choice onto the immune
    // Blitz Arm: Q5325 is only observable when the immune card is the one actually chosen.
    preferInstanceIds.push(s.perm("blitz").topCard!.instanceId);
    const spareDpBefore = s.perm("spare").currentDP;

    const cafeId = playHudieNetCafe(s, "cafe");
    await settle(() => optionIsOnBoard(s, 0, cafeId));
    const coordemonId = s.inst("coordemon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blitz").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === coordemonId),
    );

    // The immunity is up, and Coordemon's On Play still offered the immune Blitz Arm.
    expect(observe(s.engine).isRestrictedByEffect(s.perm("blitz"), "beAffected", "Digimon")).toBe(true);
    const blitzPermanentId = s.perm("blitz").permanentId;
    const blitzInstanceId = s.perm("blitz").topCard!.instanceId;
    const offeredBlitz = s.decisions.some(
      ({ req }) =>
        req.kind === "chooseTargets" &&
        (req.options?.candidateInstanceIds ?? []).some((id) => id === blitzPermanentId || id === blitzInstanceId),
    );
    expect(offeredBlitz).toBe(true);
    // Chosen, and unaffected: the -3000 landed nowhere, not on the untouched spare.
    expect(s.perm("blitz").currentDP).toBe(11000);
    expect(s.perm("spare").currentDP).toBe(spareDpBefore);
  });

  it("ends an opponent Digimon's DP reduction the moment it gains the immunity (Q5327)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-059", as: "blitz" },
            { card: "BT1-009", as: "chump" },
          ],
          hand: [{ card: "BT23-100", as: "cafe" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "cheap" }],
          security: [{ card: "BT23-028", as: "coordemon" }, { card: "BT1-010" }],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const cafeId = playHudieNetCafe(s, "cafe");
    await settle(() => optionIsOnBoard(s, 0, cafeId));

    // A throwaway attacker takes the security check, so Coordemon replays and reduces Blitz
    // Arm's DP BEFORE any immunity exists — the ordering Q5327 needs.
    const coordemonId = s.inst("coordemon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("chump").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === coordemonId),
    );
    expect(observe(s.engine).isRestrictedByEffect(s.perm("blitz"), "beAffected", "Digimon")).toBe(false);
    expect(s.perm("blitz").currentDP).toBe(8000);

    // Blitz Arm now attacks, trashes the Option and gains the immunity: the reduction ends.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blitz").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !observe(s.engine).isAttacking() && s.state.players[0]!.trash.some((c) => c.instanceId === cafeId),
    );

    expect(observe(s.engine).isRestrictedByEffect(s.perm("blitz"), "beAffected", "Digimon")).toBe(true);
    expect(s.perm("blitz").currentDP).toBe(11000);
  });
});
