import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { compiled } from "./BT17-034.js";
import "../index.js";

const source = {
  instanceId: "source",
  cardId: "BT17-034",
  ownerSeat: 0,
  definition: {},
  permanent: () => undefined,
  isOnBattleArea: () => true,
  isOwnersTurn: () => true,
  hasColor: () => true,
} as unknown as CardSource;

describe("BT17-034 Bulkmon", () => {
  it("matches the catalog printed text, evolution costs and alternate requirement", () => {
    const definition = getCardDefinition("BT17-034")!;
    expect(definition).toMatchObject({
      nameEn: "Bulkmon",
      colors: ["Yellow", "Green"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      types: ["Dragonkin", "Abadin Electronics"],
      evoCosts: [
        { color: "Yellow", level: 3, memoryCost: 3 },
        { color: "Green", level: 3, memoryCost: 3 },
      ],
    });
    expect(definition.inheritedEffectText!.replace(/\u00a0/g, " ")).toBe(
      "[All Turns] While this Digimon has [Pulsemon] in its text, it gets +1000 DP.",
    );
    const printed = definition.effectText!.replace(/\u00a0/g, " ");
    expect(printed).toContain("[Digivolve][Pulsemon]: Cost 2");
    expect(printed).toContain(
      "[When Digivolving] If you have 3 or more security cards, 1 of your opponent's Digimon gets -3000 DP for the turn. If you have 3 or fewer security cards, suspend 1 of your opponent's Digimon.",
    );
    expect(printed).toContain(
      "[All Turns] [Once Per Turn] When a card is trashed from your security stack, if [Leon Alexander] is in this Digimon's digivolution cards, ＜Recovery +1 (Deck)＞.",
    );
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Pulsemon"], cost: 2, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("registers dual security branches, security-trash recovery, and inherited DP", () => {
    const module = getEffectModule("BT17-034");
    expect(module).toBeDefined();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(2);
    expect(module!.effectsForTiming(EffectTiming.None, source)).toHaveLength(2);
    expect(compiled.effects?.[2]).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenCardTrashedFromSecurity",
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addTop",
              source: "deck",
              amount: 1,
              condition: {
                kind: "selfDigivolutionStackHasTrait",
                filter: { nameOrTrait: [{ tokens: ["Leon Alexander"], match: "nameExact" }] },
              },
            },
          ],
        },
      ],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      isInherited: true,
      actions: [
        { while: { kind: "selfTopHasText", filter: { nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] } } },
      ],
    });
  });

  it("digivolves from a Pulsemon for 2 through the printed [Pulsemon] route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-032", as: "pulsemon" }],
          hand: [{ card: "BT17-034", as: "bulkmon" }],
          security: [{ card: "BT1-012", as: "sec1" }],
          deck: [{ card: "BT1-013", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-013", as: "victim" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const pulsemonId = s.inst("pulsemon").instanceId;
    const bulkmonId = s.inst("bulkmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("pulsemon").permanentId,
        instanceId: bulkmonId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("pulsemon").topCard.instanceId === bulkmonId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("pulsemon").stack.map((card) => card.instanceId)).toEqual([pulsemonId]);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT17-034")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("costs 3 from the same Pulsemon through the printed Yellow Lv3 EvoCost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-032", as: "pulsemon" }],
          hand: [{ card: "BT17-034", as: "bulkmon" }],
          security: [{ card: "BT1-012", as: "sec1" }],
          deck: [{ card: "BT1-013", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-013", as: "victim" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("pulsemon").permanentId,
        instanceId: s.inst("bulkmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("pulsemon").topCard.cardId === "BT17-034");

    expect(s.state.memory).toBe(2);
  });

  it("refuses the [Pulsemon] route from a same-colour Lv3 that is not a Pulsemon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-047", as: "greenPulsemon" },
          { card: "BT25-032", as: "liollmon" },
        ],
        hand: [{ card: "BT17-034", as: "bulkmon" }],
        security: [{ card: "BT1-012", as: "sec1" }],
        deck: [{ card: "BT1-013", as: "drawn" }],
      },
      1: {},
    });
    s.state.memory = 5;
    await s.ready();
    const liollmonId = s.inst("liollmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("liollmon").permanentId,
        instanceId: s.inst("bulkmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).not.toEqual({ ok: true });
    expect(s.perm("liollmon").topCard.instanceId).toBe(liollmonId);
    expect(s.state.memory).toBe(5);

    // The same fixture's Pulsemon accepts the very route Liollmon refused.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenPulsemon").permanentId,
        instanceId: s.inst("bulkmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greenPulsemon").topCard.cardId === "BT17-034");
    expect(s.state.memory).toBe(3);
  });

  it("refuses an illegal off-colour non-Pulsemon source on both routes", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "monodramon" }],
        hand: [{ card: "BT17-034", as: "bulkmon" }],
        security: [{ card: "BT1-012", as: "sec1" }],
        deck: [{ card: "BT1-013", as: "drawn" }],
      },
      1: {},
    });
    s.state.memory = 5;
    await s.ready();

    for (const extra of [{}, { useAlternateCost: true as const }]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("monodramon").permanentId,
          instanceId: s.inst("bulkmon").instanceId,
          ...extra,
        }),
      ).not.toEqual({ ok: true });
    }
    expect(s.perm("monodramon").topCard.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bulkmon").instanceId);
    expect(s.state.memory).toBe(5);
  });

  it("only lowers DP when digivolving with 4 security cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-032", as: "pulsemon" }],
          hand: [{ card: "BT17-034", as: "bulkmon" }],
          security: [
            { card: "BT1-012", as: "s1" },
            { card: "BT1-012", as: "s2" },
            { card: "BT1-012", as: "s3" },
            { card: "BT1-012", as: "s4" },
          ],
          deck: [{ card: "BT1-013", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-013", as: "victim" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("pulsemon").permanentId,
        instanceId: s.inst("bulkmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("victim").currentDP !== getCardDefinition("BT1-013")!.dp);

    expect(s.perm("victim").currentDP).toBe(getCardDefinition("BT1-013")!.dp! - 3000);
    expect(s.perm("victim").isSuspended ?? false).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(4);
  });

  it("only suspends when digivolving with 2 security cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-032", as: "pulsemon" }],
          hand: [{ card: "BT17-034", as: "bulkmon" }],
          security: [
            { card: "BT1-012", as: "s1" },
            { card: "BT1-012", as: "s2" },
          ],
          deck: [{ card: "BT1-013", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-013", as: "victim" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("pulsemon").permanentId,
        instanceId: s.inst("bulkmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("victim").isSuspended === true);

    expect(s.perm("victim").isSuspended).toBe(true);
    expect(s.perm("victim").currentDP).toBe(getCardDefinition("BT1-013")!.dp);
  });

  it("fires both branches at exactly 3 security cards, per Q2784", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-032", as: "pulsemon" }],
          hand: [{ card: "BT17-034", as: "bulkmon" }],
          security: [
            { card: "BT1-012", as: "s1" },
            { card: "BT1-012", as: "s2" },
            { card: "BT1-012", as: "s3" },
          ],
          deck: [{ card: "BT1-013", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-013", as: "victim" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("pulsemon").permanentId,
        instanceId: s.inst("bulkmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("victim").isSuspended === true &&
        s.perm("victim").currentDP === getCardDefinition("BT1-013")!.dp! - 3000,
    );

    expect(s.perm("victim").isSuspended).toBe(true);
    expect(s.perm("victim").currentDP).toBe(getCardDefinition("BT1-013")!.dp! - 3000);
    expect(s.state.players[0]!.security).toHaveLength(3);
  });

  it("recovers when any of its owner's security cards is trashed with Leon Alexander in stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-034", as: "bulkmon", under: [{ card: "BT17-086", as: "leon" }] }],
        security: [{ card: "BT1-012", as: "security" }],
        deck: [{ card: "BT1-013", as: "recovery" }],
      },
      1: {},
    });
    const recoveryId = s.inst("recovery").instanceId;

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[0]!.security[0]?.instanceId === recoveryId, 400);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(recoveryId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("security").instanceId);
  });

  it("does not recover without Leon Alexander in the digivolution cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-034", as: "bulkmon", under: [{ card: "BT7-032", as: "pulsemon" }] }],
        security: [{ card: "BT1-012", as: "security" }],
        deck: [{ card: "BT1-013", as: "notRecovered" }],
      },
      1: {},
    });
    const notRecoveredId = s.inst("notRecovered").instanceId;

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("security").instanceId));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(notRecoveredId);
  });

  it("recovers at most once per turn when two security cards are trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-034", as: "bulkmon", under: [{ card: "BT17-086", as: "leon" }] }],
          security: [
            { card: "BT1-012", as: "s1" },
            { card: "BT1-012", as: "s2" },
          ],
          hand: [{ card: "BT1-013", as: "spare" }],
          deck: [
            { card: "BT1-013", as: "recovery1" },
            { card: "BT1-013", as: "recovery2" },
            { card: "BT1-013", as: "spareDeck" },
          ],
        },
        1: { battleArea: [{ card: "BT1-013", as: "idle" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const recovery1 = s.inst("recovery1").instanceId;
    const recovery2 = s.inst("recovery2").instanceId;

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === recovery1), 400);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toContain(recovery1);
    expect(s.state.players[0]!.trash).toHaveLength(1);

    // Second trash in the SAME turn: the once-per-turn gate refuses the second Recovery.
    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[0]!.trash.length >= 2, 400);

    expect(s.state.players[0]!.security.some((card) => card.instanceId === recovery2)).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(recovery2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("recovers after a normal security check trashes a card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-034", as: "bulkmon", under: [{ card: "BT17-086", as: "leon" }] }],
          security: [{ card: "BT1-012", as: "checked" }],
          deck: [{ card: "BT1-013", as: "recovery" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoDeclineOptional: true },
    );
    const recoveryId = s.inst("recovery").instanceId;
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === recoveryId));

    expect(s.state.players[0]!.security.some((card) => card.instanceId === recoveryId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("checked").instanceId)).toBe(true);
  });

  it("does not recover when a security card is added to hand instead of trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-034", as: "bulkmon", under: [{ card: "BT17-086", as: "leon" }] }],
          hand: [{ card: "BT25-033", as: "aegiomon" }],
          security: [{ card: "BT1-012", as: "to-hand" }],
          deck: [{ card: "BT1-013", as: "should-not-recover" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aegiomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("to-hand").instanceId));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("to-hand").instanceId)).toBe(true);
  });

  it("grants the inherited +1000 DP only under a host whose text names Pulsemon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-036", as: "boutmon", under: [{ card: "BT17-034", as: "bulkmonUnderBoutmon" }] },
          { card: "BT17-032", as: "kyubimon", under: [{ card: "BT17-034", as: "bulkmonUnderKyubimon" }] },
        ],
        security: [{ card: "BT1-012", as: "s1" }],
        deck: [{ card: "BT1-013", as: "drawn" }],
      },
      1: {},
    });
    await s.ready();

    expect(s.perm("boutmon").currentDP).toBe(getCardDefinition("BT17-036")!.dp! + 1000);
    expect(s.perm("kyubimon").currentDP).toBe(getCardDefinition("BT17-032")!.dp);
  });
});
