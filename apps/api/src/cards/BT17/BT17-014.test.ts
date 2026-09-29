import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { EffectDuration, EffectTiming, type CardInstance } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import {
  drainMicrotasks,
  setupEngine,
  settle,
  type EngineSetup,
  type PermanentSpec,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-014.js";
import "../BT12/BT12-088.js";
import "./BT17-011.js";
import "./BT17-012.js";
import "../BT5/BT5-091.js";
import "../BT14/BT14-034.js";
import "../BT2/BT2-107.js";

function handMainEffectKey(s: EngineSetup, instance: CardInstance): string {
  const source = (s.engine as unknown as { cardSourceOf(card: CardInstance): CardSource }).cardSourceOf(instance);
  const effect = effectsOf(EffectTiming.OnDeclaration, source).find(({ effectKey }) =>
    effectKey.startsWith("BT17-014/"),
  );
  if (effect?.effectKey === undefined) throw new Error("BT17-014 surfaces no [Hand][Main] effect");
  return effect.effectKey;
}

describe("BT17-014", () => {
  it("matches the catalog printed text, colors, level and evolution costs", () => {
    expect(getCardDefinition("BT17-014")).toMatchObject({
      cardId: "BT17-014",
      nameEn: "Aldamon",
      colors: ["Red", "Purple"],
      kinds: ["Digimon"],
      level: 5,
      dp: 8000,
      forms: ["Hybrid"],
      evoCosts: [
        { color: "Red", level: 4, memoryCost: 4 },
        { color: "Purple", level: 4, memoryCost: 4 },
      ],
    });
    expect(getCardDefinition("BT17-014")!.effectText).toBe(
      "[Hand] [Main] By placing 1 [Agunimon] and [BurningGreymon] from your trash under 1 of your [Takuya Kanbara]s, " +
        "digivolve it into this card as if that card is a level 4 red Digimon for a digivolution cost of 3.  " +
        "[When Digivolving] Delete 1 of your opponent's Digimon with 6000 DP or less.",
    );
    const inherited = getCardDefinition("BT17-014")!.inheritedEffectText!;
    expect(inherited.replace(/\u00a0/g, " ")).toBe(
      "[Your Turn] While this Digimon has the [Hybrid]/[Ten Warriors] trait, it doesn't activate " +
        "[Security] effects on option cards it checks.",
    );
    expect([...inherited].map((ch, i) => (ch.charCodeAt(0) === 0xa0 ? i : -1)).filter((i) => i >= 0)).toEqual([62]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("digivolves a Takuya Kanbara into itself for 3 by placing Agunimon and BurningGreymon", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      isFromHand: true,
      actions: [
        {
          kind: "Digivolve",
          target: { fromSelectionRef: "takuyaHost", filter: { kind: ["Tamer"] } },
          costOverride: 3,
          virtualBase: { level: 4, colors: ["Red"] },
          cost: { kind: "place", bindHostAs: "takuyaHost" },
          additionalCosts: [{ kind: "place", host: { filter: { boundRef: "takuyaHost" }, count: 1 } }],
        },
      ],
    });
    expect(compiled.effects?.[0]?.actions?.[0]).not.toHaveProperty("ignoreRequirements");
  });

  it("uses its [Hand][Main] effect to stack both trash materials, digivolve Takuya, draw and delete", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-014", as: "aldamon" }],
          battleArea: [{ card: "BT12-088", as: "takuya" }],
          trash: [
            { card: "BT17-011", as: "agunimon" },
            { card: "BT17-012", as: "burning" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true, autoOrderCards: false },
    );
    s.state.memory = 3;
    await s.ready();
    const aldamon = s.inst("aldamon");
    const takuyaInstanceId = s.perm("takuya").topCard.instanceId;
    const drawnId = s.inst("drawn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: aldamon.instanceId,
        effectKey: handMainEffectKey(s, aldamon),
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("takuya").topCard.cardId === "BT17-014");

    expect(s.perm("takuya").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT17-011", "BT17-012", "BT12-088"]),
    );
    expect(s.perm("takuya").stack.at(-1)?.cardId).toBe("BT12-088");
    expect(s.perm("takuya").stack.map(({ instanceId }) => instanceId)).toContain(takuyaInstanceId);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(drawnId);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === aldamon.instanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("gains the digivolution-card Tamer's inherited effect after digivolving, per Q6563", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-014", as: "aldamon" }],
          battleArea: [{ card: "BT12-088", as: "takuya" }],
          trash: [
            { card: "BT17-011", as: "agunimon" },
            { card: "BT17-012", as: "burning" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true, autoOrderCards: false },
    );
    s.state.memory = 3;
    await s.ready();
    const aldamon = s.inst("aldamon");

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: aldamon.instanceId,
        effectKey: handMainEffectKey(s, aldamon),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT17-014");
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("takuya").currentDP).toBe(14000);
  });

  it("deletes an opposing Digimon at 6000 DP or less", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "Delete", target: { filter: { dp: { op: "lte", value: 6000 } } } }],
    });
  });

  it("leaves an opposing Digimon above 6000 DP alive when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-014", as: "aldamon" }],
          battleArea: [{ card: "BT12-088", as: "takuya" }],
          trash: [
            { card: "BT17-011", as: "agunimon" },
            { card: "BT17-012", as: "burning" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "tank", dp: 7000 }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true, autoOrderCards: false },
    );
    s.state.memory = 3;
    await s.ready();
    const aldamon = s.inst("aldamon");
    const tankId = s.perm("tank").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: aldamon.instanceId,
        effectKey: handMainEffectKey(s, aldamon),
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("takuya").topCard.cardId === "BT17-014");

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("tank").topCard.instanceId).toBe(tankId);
  });

  it("prevents security option effects as inherited for Hybrid or Ten Warriors", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "GrantStatic",
          grant: "noSecurityOptionEffects",
          duration: "permanent",
          condition: { kind: "selfHasTrait" },
        },
      ],
    });
  });

  it("suppresses only Option security effects, and only under a Hybrid or Ten Warriors host", async () => {
    const matching = setupEngine({
      0: { battleArea: [{ card: "BT17-011", as: "host", under: ["BT17-014"] }] },
    });
    await matching.engine.recomputeContinuousEffects();
    expect(observe(matching.engine).suppressesSecurityEffect(matching.perm("host"), "BT2-107")).toBe(true);
    expect(observe(matching.engine).suppressesSecurityEffect(matching.perm("host"), "BT12-088")).toBe(false);

    const other = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT17-014"] }] },
    });
    await other.engine.recomputeContinuousEffects();
    expect(observe(other.engine).suppressesSecurityEffect(other.perm("host"), "BT2-107")).toBe(false);
  });
});

function setupTakuyaDigivolution(
  options: {
    takuyaEnteredThisTurn?: boolean;
    extraBattleArea?: PermanentSpec[];
    opponentBattleArea?: PermanentSpec[];
    memory?: number;
    autoAcceptOptional?: boolean;
  } = {},
): EngineSetup {
  const s = setupEngine(
    {
      0: {
        hand: [{ card: "BT17-014", as: "aldamon" }],
        battleArea: [
          { card: "BT12-088", as: "takuya", enteredThisTurn: options.takuyaEnteredThisTurn ?? false },
          ...(options.extraBattleArea ?? []),
        ],
        trash: [
          { card: "BT17-011", as: "agunimon" },
          { card: "BT17-012", as: "burning" },
        ],
        deck: [{ card: "BT1-009", as: "drawn" }, { card: "BT1-013", as: "secondDraw" }, "BT1-009"],
        security: ["BT1-009", "BT1-013"],
      },
      1: {
        battleArea: options.opponentBattleArea ?? [],
        security: ["BT1-009", "BT1-013", "BT1-009"],
        deck: ["BT1-009", "BT1-013"],
      },
    },
    {
      autoSelectCards: true,
      autoOrderTriggers: true,
      autoOrderCards: false,
      ...(options.autoAcceptOptional === true ? { autoAcceptOptional: true } : {}),
    },
  );
  s.state.memory = options.memory ?? 3;
  return s;
}

function activateHandMain(s: EngineSetup): ReturnType<EngineSetup["engine"]["applyIntent"]> {
  const aldamon = s.inst("aldamon");
  return s.engine.applyIntent(0, {
    type: "activateEffect",
    sourceInstanceId: aldamon.instanceId,
    effectKey: handMainEffectKey(s, aldamon),
  });
}

describe("BT17-014 Aldamon — KB Q&A rulings", () => {
  it("still activates [Security] effects of Digimon and Tamer cards it checks (Q2741)", async () => {
    async function checkTopSecurity(hostCard: string, securityCard: string): Promise<EngineSetup> {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: hostCard, as: "host", under: ["BT17-014"] }] },
          1: {
            security: [{ card: securityCard, as: "checked" }, "BT1-009"],
            deck: ["BT1-009", "BT1-013"],
          },
        },
        { autoSelectCards: true, autoAcceptOptional: true },
      );
      s.state.memory = 3;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await advance(s.engine).finishAttack();
      await drainMicrotasks(100);
      return s;
    }
    function playedFromSecurity(s: EngineSetup): boolean {
      const checkedId = s.inst("checked").instanceId;
      return s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.instanceId === checkedId);
    }

    const tamerChecked = await checkTopSecurity("BT17-011", "BT12-088");
    expect(playedFromSecurity(tamerChecked)).toBe(true);

    const digimonChecked = await checkTopSecurity("BT17-011", "BT14-034");
    expect(playedFromSecurity(digimonChecked)).toBe(true);

    const optionChecked = await checkTopSecurity("BT17-011", "BT2-107");
    expect(optionChecked.state.memory).toBe(3);

    const optionCheckedByNonHybrid = await checkTopSecurity("BT1-009", "BT2-107");
    expect(optionCheckedByNonHybrid.state.memory).toBe(1);
  });

  it("digivolves Takuya through its [Main] effect for exactly 3 memory, never the printed cost of 4 (Q2742)", async () => {
    const s = setupTakuyaDigivolution({ memory: 5 });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("aldamon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(5);

    expect(activateHandMain(s)).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT17-014");

    expect(s.state.memory).toBe(2);
  });

  // Engine gap: a Tamer digivolved "as if it is a Digimon" by an effect is still flagged
  // `tamerDigivolved`, so Digimon-only digivolve watchers stay silent, and the effect-digivolve
  // path never consults "can't digivolve" locks.
  it.fails("treats the Tamer as a digivolving Digimon: fires digivolve triggers and obeys a can't-digivolve lock (Q6558)", async () => {
    const watched = setupTakuyaDigivolution({
      extraBattleArea: [{ card: "BT5-091", as: "watcherTamer" }],
      opponentBattleArea: [{ card: "BT1-009", as: "prey", dp: 3000 }],
      autoAcceptOptional: true,
    });
    await watched.ready();
    const handBefore = watched.state.players[0]!.hand.length;

    expect(activateHandMain(watched)).toEqual({ ok: true });
    await settle(() => watched.perm("takuya").topCard.cardId === "BT17-014");
    await drainMicrotasks(100);

    expect(watched.state.players[1]!.battleArea).toHaveLength(0);
    expect(watched.perm("watcherTamer").isSuspended).toBe(true);
    // Aldamon leaves the hand; the digivolution bonus draw and the watcher's draw each add a card.
    expect(watched.state.players[0]!.hand).toHaveLength(handBefore - 1 + 2);

    const locked = setupTakuyaDigivolution();
    await locked.ready();
    advance(locked.engine).ledgers.continuous.addUnsuspendedDigivolveProhibition(
      0,
      1,
      EffectDuration.UntilOpponentTurnEnd,
    );
    await advance(locked.engine).recompute();

    activateHandMain(locked);
    await drainMicrotasks(100);

    expect(locked.perm("takuya").topCard.cardId).toBe("BT12-088");
    expect(locked.state.memory).toBe(3);
    expect(locked.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      locked.inst("aldamon").instanceId,
    );
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q6559)", async () => {
    const s = setupTakuyaDigivolution();
    await s.ready();
    const drawnId = s.inst("drawn").instanceId;
    const deckBefore = s.state.players[0]!.deck.length;

    expect(activateHandMain(s)).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT17-014");

    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([drawnId]);
  });

  it("cannot attack the turn it digivolves from a Tamer played that turn (Q6560)", async () => {
    const fresh = setupTakuyaDigivolution({ takuyaEnteredThisTurn: true });
    await fresh.ready();
    expect(activateHandMain(fresh)).toEqual({ ok: true });
    await settle(() => fresh.perm("takuya").topCard.cardId === "BT17-014");

    expect(
      fresh.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: fresh.perm("takuya").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(fresh.state.players[1]!.security).toHaveLength(3);

    const established = setupTakuyaDigivolution();
    await established.ready();
    expect(activateHandMain(established)).toEqual({ ok: true });
    await settle(() => established.perm("takuya").topCard.cardId === "BT17-014");

    expect(
      established.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: established.perm("takuya").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await advance(established.engine).finishAttack();
  });

  it("keeps the Tamer as a digivolution card that is trashed with the Digimon (Q6561)", async () => {
    const s = setupTakuyaDigivolution();
    await s.ready();
    const takuyaInstanceId = s.perm("takuya").topCard.instanceId;
    const aldamonInstanceId = s.inst("aldamon").instanceId;

    expect(activateHandMain(s)).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT17-014");
    const aldamonPermanentId = s.perm("takuya").permanentId;
    expect(s.perm("takuya").stack.map(({ instanceId }) => instanceId)).toContain(takuyaInstanceId);

    expect(await advance(s.engine).verb.deletePermanent([aldamonPermanentId])).toBe(1);

    const trashIds = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);
    expect(trashIds).toEqual(
      expect.arrayContaining([
        takuyaInstanceId,
        aldamonInstanceId,
        s.inst("agunimon").instanceId,
        s.inst("burning").instanceId,
      ]),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("does not gain the [Security] effect printed in the lower text of a Tamer in its digivolution cards (Q6562)", async () => {
    const s = setupTakuyaDigivolution();
    await s.ready();
    const takuya = s.perm("takuya").topCard;

    expect(activateHandMain(s)).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT17-014");
    await s.engine.recomputeContinuousEffects();
    const aldamon = s.perm("takuya");
    const takuyaSecurityEffects = effectsOf(EffectTiming.SecuritySkill, observe(s.engine).cardSource(takuya));
    expect(takuyaSecurityEffects.map(({ isSecurity }) => isSecurity)).toEqual([true]);
    expect(takuyaSecurityEffects.every(({ isInherited }) => !isInherited)).toBe(true);
    expect(observe(s.engine).canUseInheritedEffect(aldamon, "BT12-088")).toBe(true);
    expect(aldamon.currentDP).toBe(14000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: aldamon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    await drainMicrotasks(100);

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("takuya").topCard.cardId).toBe("BT17-014");
    expect(s.perm("takuya").stack.map(({ instanceId }) => instanceId)).toContain(takuya.instanceId);
  });
});
