import {
  EffectDuration,
  EffectTiming,
  Zone,
  digivolutionRequirementsFor,
  type CardDefinition,
  type Seat,
} from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import module from "./BT26-012.js";
import "../index.js";

const CARD_ID = "BT26-012";

describe("BT26-012 Manekimon", () => {
  it("uses the exact off-color Lv.3 [Shambala] cost-2 evolution path and rejects a near-match", () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 3,
      traits: ["Shambala"],
      cost: 2,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT26-008", as: "shambala" }],
        hand: [{ card: CARD_ID, as: "manekimon" }],
      },
    });
    legal.state.memory = 2;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("shambala").permanentId,
        instanceId: legal.inst("manekimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "BT1-030", as: "nearMatch" }],
        hand: [{ card: CARD_ID, as: "manekimon" }],
      },
    });
    illegal.state.memory = 2;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("nearMatch").permanentId,
        instanceId: illegal.inst("manekimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("plays exactly 1 [TB] Digimon from hand for 2 less and spends its once-per-turn activation", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "manekimon" }],
          hand: [
            { card: "BT26-014", as: "tb" },
            { card: "BT1-009", as: "nonTb" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 5;
    preferred.push(s.inst("tb").instanceId);

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("manekimon"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-014")).toBe(true);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("nonTb").instanceId]);

    s.give(0, Zone.Hand, { card: "BT26-008", as: "secondTb" });
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("manekimon"));
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("secondTb").instanceId)).toBe(true);
  });

  it("the Option branch pays printed cost minus 2 and delegates resolution to useOptionFromHand", async () => {
    const option = { instanceId: "option", cardId: "EX12-070", ownerSeat: 0 as Seat };
    const source = {
      ownerSeat: 0 as Seat,
      isOnBattleArea: () => true,
    } as CardSource;
    const useOptionFromHand = vi.fn(async () => [option]);
    const ctx = {
      source,
      game: {
        player: () => ({ hand: [option] }),
        definitionOf: () => ({ cardId: "EX12-070", kinds: ["Option"], types: ["TB"], playCost: 3 }) as CardDefinition,
      },
      ask: { selectCards: vi.fn(async () => [option.instanceId]) },
      fx: { useOptionFromHand },
    } as unknown as EffectContext;

    await module.effectsForTiming(EffectTiming.OnDeclaration, source)[0]!.resolve(ctx);

    expect(useOptionFromHand).toHaveBeenCalledWith(ctx, option.instanceId, 3, {
      payCost: true,
      costDelta: 2,
    });
  });

  it("Q6967 pays an Option's full cost when play-cost reductions are prohibited", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "manekimon" }],
          hand: [
            { card: "EX12-070", as: "option" },
            { card: "BT26-008", as: "payment" },
          ],
          deck: [{ card: "BT1-001" }, { card: "BT1-002" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 3;
    preferred.push(s.inst("option").instanceId, s.inst("payment").instanceId);
    advance(s.engine).ledgers.continuous.addCostReductionBlock(0, "play", EffectDuration.UntilEachTurnEnd);

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("manekimon"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("option").instanceId)).toBe(false);
  });

  it("Q6968 leaves a selected Digimon in hand when effect-driven plays are prohibited", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "manekimon" }],
          hand: [{ card: "BT26-014", as: "tb" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 5;
    preferred.push(s.inst("tb").instanceId);
    advance(s.engine).ledgers.continuous.addPlayProhibition(
      0,
      1,
      { kinds: ["Digimon"] },
      "play",
      EffectDuration.UntilEachTurnEnd,
      { byEffectOnly: true },
    );

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("manekimon"));

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("tb").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("its inherited effect debuffs one opponent Digimon on attack and is once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-014", as: "host", under: [{ card: CARD_ID, as: "source" }] }] },
      1: { battleArea: [{ card: "BT24-023", as: "target" }] },
    });

    await advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.perm("target").currentDP).toBe(5000);

    await advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.perm("target").currentDP).toBe(5000);
  });

  it("offers only opponent Digimon, excluding Tamers and breeding, and lasts for the turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-014", as: "host", under: [{ card: CARD_ID }] }] },
      1: {
        battleArea: [
          { card: "BT24-023", as: "digimon" },
          { card: "BT1-089", as: "tamer" },
        ],
        breeding: { card: "BT21-005", as: "egg" },
      },
    });
    await advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(s.perm("digimon").currentDP).toBe(5000);
    expect(s.perm("tamer").currentDP).toBe(0);
    expect(s.perm("egg").currentDP).toBe(0);
  });
});
