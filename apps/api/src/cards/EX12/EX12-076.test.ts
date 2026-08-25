import {
  assemblyRequirementFor,
  compiledEffects,
  digivolutionRequirementsFor,
  EffectTiming,
  getCardDefinition,
} from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { compiled } from "./EX12-076.js";

import "../index.js";

const CARD_ID = "EX12-076";
const FOUR_COLOR_STACK = ["EX12-015", "EX12-019", "EX12-020"];
const THREE_COLOR_STACK = ["EX12-015", "EX12-019"];

describe("EX12-076 Susanoomon", () => {
  it("preserves the printed evolution and Assembly requirements", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 6, traits: ["Hybrid", "Shambala", "TS"], cost: 5, isAlternate: true },
    ]);
    expect(compiled.assemblyRequirement).toEqual([
      {
        materials: [{ count: 8, traits: ["Hybrid", "Shambala"], differentNames: true }],
        reduceCost: 9,
      },
    ]);
    expect(digivolutionRequirementsFor(CARD_ID)).toEqual(compiled.digivolutionRequirement);
    expect(assemblyRequirementFor(CARD_ID)).toEqual(compiled.assemblyRequirement);
    expect(registeredCompiledCards.get(CARD_ID)).toEqual(compiled);
    expect(compiledEffects[CARD_ID]).toEqual(compiled);
  });

  it("trashes the opponent's top security and recovers only after the four-color condition", () => {
    const attacking = compiled.effects.find((effect) => effect.trigger === "WhenAttacking")!;
    expect(attacking.frequency).toBe("OncePerTurn");
    expect(attacking.actions[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      controller: "opponent",
    });
    expect(attacking.actions.slice(1)).toMatchObject([
      {
        kind: "SecurityManipulation",
        op: "trashTop",
        controller: "opponent",
        amount: 1,
        condition: { kind: "selfDigivolutionStackDistinctColorCount", op: "gte", value: 4 },
      },
      {
        kind: "GainKeyword",
        keyword: { keyword: "Recovery", amount: 1 },
        condition: { kind: "selfDigivolutionStackDistinctColorCount", op: "gte", value: 4 },
      },
    ]);
  });

  it("keeps Rush, Raid, Blocker, and the Rule-granted Hybrid trait active", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "susanoo" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("susanoo"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("susanoo"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("susanoo"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("susanoo"), "Hybrid")).toBe(true);
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "reduces every opposing Digimon by 3000 for each distinct stack color at %s",
    async (timing) => {
      const s = setupEngine({
        0: { battleArea: [{ card: CARD_ID, as: "susanoo", under: FOUR_COLOR_STACK }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", dp: 16000 },
            { card: "BT1-010", as: "second", dp: 14000 },
          ],
        },
      });
      await s.ready();

      await advance(s.engine).fire(timing, s.perm("susanoo"));

      expect(s.perm("first").currentDP).toBe(4000);
      expect(s.perm("second").currentDP).toBe(2000);
    },
  );

  it("places the opponent's Digimon in security without the conditional trash or Recovery at three colors", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "susanoo", under: THREE_COLOR_STACK }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const victimId = s.perm("victim").topCard!.instanceId;
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("susanoo"));

    expect(s.state.players[1]!.security.at(-1)?.instanceId).toBe(victimId);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === victimId)).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("trashes the placed security Digimon and recovers one card at four colors", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "susanoo", under: FOUR_COLOR_STACK }],
          deck: ["BT1-101"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const victimId = s.perm("victim").topCard!.instanceId;
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("susanoo"));

    expect(s.state.players[1]!.security.some((card) => card.instanceId === victimId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === victimId)).toBe(true);
    expect(s.state.players[0]!.security.at(-1)?.cardId).toBe("BT1-101");
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("stops the conditional tail when a would-leave reaction removes Susanoomon (Q7194)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "susanoo", under: FOUR_COLOR_STACK }],
          deck: ["BT1-101"],
        },
        1: {
          battleArea: [
            { card: "BT24-018", as: "victim" },
            { card: "BT24-018", as: "leaveWatcher" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const susanooId = s.perm("susanoo").permanentId;
    const victimId = s.perm("victim").topCard!.instanceId;
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("susanoo"));
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === CARD_ID));

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === susanooId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.instanceId === victimId)).toBe(true);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).not.toContain(victimId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).not.toContain(victimId);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("uses the cost-5 alternate evolution route and rejects a nonmatching level-6 base", async () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "EX12-019", as: "base" }], hand: [{ card: CARD_ID, as: "susanoo" }] },
    });
    legal.state.memory = 5;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("susanoo").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard?.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "AD1-004", as: "base" }], hand: [{ card: CARD_ID, as: "susanoo" }] },
    });
    illegal.state.memory = 6;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("susanoo").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("plays by Assembly with eight different matching names and rejects a duplicate", async () => {
    const materials = [
      "EX12-006",
      "EX12-009",
      "EX12-011",
      "EX12-015",
      "EX12-020",
      "EX12-025",
      "EX12-031",
      "EX12-036",
    ] as const;
    const legal = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "susanoo" }],
        trash: materials.map((card, index) => ({ card, as: `material${index}` })),
      },
    });
    legal.state.memory = 7;
    expect(
      legal.engine.applyIntent(0, {
        type: "playCard",
        instanceId: legal.inst("susanoo").instanceId,
        assembly: {
          materialInstanceIds: materials.map((_card, index) => legal.inst(`material${index}`).instanceId),
        },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => legal.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));
    expect(legal.state.players[0]!.battleArea[0]!.stack).toHaveLength(8);
    expect(legal.state.memory).toBe(0);

    const duplicateMaterials = [...materials.slice(0, 7), "EX12-006"] as const;
    const duplicate = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "susanoo" }],
        trash: duplicateMaterials.map((card, index) => ({ card, as: `material${index}` })),
      },
    });
    duplicate.state.memory = 7;
    expect(
      duplicate.engine.applyIntent(0, {
        type: "playCard",
        instanceId: duplicate.inst("susanoo").instanceId,
        assembly: {
          materialInstanceIds: duplicateMaterials.map((_card, index) => duplicate.inst(`material${index}`).instanceId),
        },
      } as never),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("matches the complete catalog identity", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Susanoomon",
      colors: ["Yellow", "White", "Red"],
      kinds: ["Digimon"],
      playCost: 16,
      dp: 16000,
      level: 7,
      evoCosts: [{ color: "All", level: 6, memoryCost: 6 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Shaman", "Shambala", "SW", "TB", "TS"],
    });
  });
});
