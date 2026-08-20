import {
  EffectDuration,
  EffectTiming,
  appFusionCostFor,
  assemblyRequirementFor,
  type CardDefinition,
  type Seat,
} from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import module from "./BT26-028.js";
import "../index.js";

const CARD_ID = "BT26-028";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? "TEST",
    set: "TEST",
    nameEn: "Fixture",
    kinds: (over.kinds as never) ?? (["Digimon"] as never),
    colors: over.colors ?? [],
    playCost: over.playCost ?? 0,
    dp: over.dp ?? 0,
    level: over.level,
    forms: over.forms ?? [],
    attributes: over.attributes ?? [],
    types: over.types ?? [],
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function source(stack: { instanceId: string; cardId: string }[]): CardSource {
  return {
    instanceId: "medicmon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID }),
    permanent: () => ({ permanentId: "medicmon", stack }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-028 Medicmon", () => {
  it("exposes all six legal App Fusion pairs and rejects same-name or unrelated pairs (Q6993)", () => {
    const names = ["Aidmon", "Supplemon", "Spamon"];
    for (const topName of names) {
      for (const linkedName of names.filter((name) => name !== topName)) {
        expect(appFusionCostFor(CARD_ID, { topName, linkedNames: [linkedName] })).toBe(0);
      }
    }
    expect(appFusionCostFor(CARD_ID, { topName: "Aidmon", linkedNames: ["Aidmon"] })).toBeUndefined();
    expect(appFusionCostFor(CARD_ID, { topName: "Aidmon", linkedNames: ["Unrelated"] })).toBeUndefined();
  });

  it("exposes the exact Assembly -2 recipe and publicly plays for 3, then links its material for free", async () => {
    expect(assemblyRequirementFor(CARD_ID)).toEqual([
      { reduceCost: 2, materials: [{ traits: ["Life", "System", "Seven Code"], level: 3, count: 1 }] },
    ]);
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "medicmon" }],
          trash: [{ card: "BT23-007", as: "lifeMaterial", faceUp: false }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("medicmon").instanceId,
        assembly: { materialInstanceIds: [s.inst("lifeMaterial").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.linked.some((card) => card.cardId === "BT23-007")));
    await settle();
    const medicmon = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === CARD_ID)!;
    expect(s.state.memory).toBe(0);
    expect(medicmon.stack).toHaveLength(0);
    expect(medicmon.linked).toHaveLength(1);
    expect(medicmon.linked[0]).toMatchObject({ cardId: "BT23-007", faceUp: true });
    expect(observe(s.engine).hasKeyword(medicmon, "Barrier")).toBe(true);
  });

  it("rejects Assembly material from the wrong zone or outside the exact level/trait recipe", async () => {
    const wrongZone = setupEngine({
      0: {
        hand: [
          { card: CARD_ID, as: "medicmon" },
          { card: "BT23-007", as: "material" },
        ],
      },
    });
    wrongZone.state.memory = 3;
    expect(
      wrongZone.engine.applyIntent(0, {
        type: "playCard",
        instanceId: wrongZone.inst("medicmon").instanceId,
        assembly: { materialInstanceIds: [wrongZone.inst("material").instanceId] },
      } as never),
    ).toEqual({ ok: false, reason: "invalid-material" });

    const wrongTrait = setupEngine({
      0: { hand: [{ card: CARD_ID, as: "medicmon" }], trash: [{ card: "AD1-002", as: "material" }] },
    });
    wrongTrait.state.memory = 3;
    expect(
      wrongTrait.engine.applyIntent(0, {
        type: "playCard",
        instanceId: wrongTrait.inst("medicmon").instanceId,
        assembly: { materialInstanceIds: [wrongTrait.inst("material").instanceId] },
      } as never),
    ).toEqual({ ok: false, reason: "invalid-material" });
  });

  it("ordinarily digivolves for 2 and links its eligible Lv.3 source during When Digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-032", as: "base" }],
          hand: [{ card: CARD_ID, as: "medicmon" }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("medicmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").linked.some((card) => card.cardId === "BT24-032"));
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.cardId).toBe(CARD_ID);
    expect(s.perm("base").stack).toHaveLength(0);
  });

  it("offers exact Life/System/Seven Code Lv.3 cards only when they actually have Link (Q6987)", async () => {
    const eligible = { instanceId: "eligible", cardId: "LIFE" };
    const noLink = { instanceId: "no-link", cardId: "SYSTEM" };
    const wrongLevel = { instanceId: "wrong-level", cardId: "SEVEN" };
    const near = { instanceId: "near", cardId: "NEAR" };
    const cardSource = source([eligible, noLink, wrongLevel, near]);
    const game = {
      definitionOf: (card: { cardId: string }) => {
        if (card.cardId === "LIFE")
          return fakeDef({ level: 3, attributes: ["Life"], linkRequirement: "[Link] [Appmon] trait: Cost 1" });
        if (card.cardId === "SYSTEM") return fakeDef({ level: 3, types: ["System"] });
        if (card.cardId === "SEVEN")
          return fakeDef({ level: 4, types: ["Seven Code"], linkRequirement: "[Link] [Appmon] trait: Cost 1" });
        return fakeDef({ level: 3, types: ["Life Support"], linkRequirement: "[Link] [Appmon] trait: Cost 1" });
      },
    } as unknown as GameAccess;
    const selectCards = vi.fn(async (_ctx, opts: { candidates: string[] }) => {
      expect(opts.candidates).toEqual([eligible.instanceId]);
      return [eligible.instanceId];
    });
    const link = vi.fn(async () => [eligible.instanceId]);
    await module.effectsForTiming(EffectTiming.OnPlay, cardSource)[0]!.resolve({
      source: cardSource,
      game,
      ask: { selectCards },
      fx: { link } as unknown as Primitives,
    } as unknown as EffectContext);
    expect(link).toHaveBeenCalledWith("medicmon", [eligible.instanceId]);
  });

  it("allows declining Link and declares both timing variants without an OPT budget", async () => {
    const eligible = { instanceId: "eligible", cardId: "LIFE" };
    const cardSource = source([eligible]);
    const game = {
      definitionOf: () => fakeDef({ level: 3, attributes: ["Life"], linkRequirement: "[Link] [Appmon] trait: Cost 1" }),
    } as unknown as GameAccess;
    const link = vi.fn();
    await module.effectsForTiming(EffectTiming.WhenDigivolving, cardSource)[0]!.resolve({
      source: cardSource,
      game,
      ask: { selectCards: vi.fn(async () => []) },
      fx: { link } as unknown as Primitives,
    } as unknown as EffectContext);
    expect(link).not.toHaveBeenCalled();
    expect(module.effectsForTiming(EffectTiming.OnPlay, cardSource)[0]!.maxPerTurn).toBe(-1);
    expect(module.effectsForTiming(EffectTiming.WhenDigivolving, cardSource)[0]!.maxPerTurn).toBe(-1);
  });

  it("public linkCard resolves its linked-face When Linking in the same window", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "appmonHost" }],
        hand: [{ card: CARD_ID, as: "medicmonLink" }],
      },
      1: {
        battleArea: [
          { card: "BT26-014", as: "opponentDigimon", dp: 7000 },
          { card: "BT26-090", as: "opponentTamer" },
        ],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("medicmonLink").instanceId,
        targetPermanentId: s.perm("appmonHost").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("appmonHost").linked.some((card) => card.cardId === CARD_ID));
    await settle(() => s.perm("opponentDigimon").currentDP === 4000);

    expect(s.state.memory).toBe(0);
    expect(s.perm("appmonHost").linked[0]).toMatchObject({
      instanceId: s.inst("medicmonLink").instanceId,
      faceUp: true,
    });
    expect(s.perm("opponentTamer").currentDP).toBe(0);
    expect(observe(s.engine).isRestricted(s.perm("opponentDigimon"), "cannotActivateWhenDigivolving")).toBe(true);
  });

  it("the linked-only watcher matches only its own linking operation, filters to opponent Digimon, and applies exact duration", async () => {
    const cardSource = source([]);
    const installs: Array<Parameters<Primitives["subscribeSubTrigger"]>[0]> = [];
    const linkedEffect = module
      .effectsForTiming(EffectTiming.None, cardSource)
      .find((effect) => effect.effectKey.endsWith("link-face-when-linking-lock-dp"))!;
    expect(linkedEffect.isLinked).toBe(true);
    await linkedEffect.resolve({
      source: cardSource,
      fx: {
        subscribeSubTrigger: (install: Parameters<Primitives["subscribeSubTrigger"]>[0]) => installs.push(install),
      } as unknown as Primitives,
    } as unknown as EffectContext);
    expect(installs).toHaveLength(1);
    const watcher = installs[0]!;
    expect(watcher.matches!({ trigger: { linkedCardInstanceIds: ["someone-else"] } } as unknown as EffectContext)).toBe(
      false,
    );
    expect(
      watcher.matches!({ trigger: { linkedCardInstanceIds: [cardSource.instanceId] } } as unknown as EffectContext),
    ).toBe(true);

    const chooseTargets = vi.fn(async (_ctx, options: { candidates: string[] }) => {
      expect(options.candidates).toEqual(["first", "second"]);
      return ["second"];
    });
    const restrict = vi.fn();
    const modifyDP = vi.fn();
    await watcher.run({
      source: cardSource,
      game: {
        opponentOf: () => 1 as Seat,
        player: () => ({
          battleArea: [
            { permanentId: "first", topCard: { cardId: "DIGIMON" }, inBreeding: false },
            { permanentId: "second", topCard: { cardId: "DIGIMON" }, inBreeding: false },
            { permanentId: "tamer", topCard: { cardId: "TAMER" }, inBreeding: false },
            { permanentId: "breeding", topCard: { cardId: "DIGIMON" }, inBreeding: true },
          ],
        }),
        definitionOf: (card: { cardId: string }) =>
          fakeDef({ kinds: (card.cardId === "TAMER" ? ["Tamer"] : ["Digimon"]) as never }),
      } as unknown as GameAccess,
      ask: { chooseTargets },
      fx: { restrict, modifyDP } as unknown as Primitives,
    } as unknown as EffectContext);
    expect(restrict).toHaveBeenCalledWith(
      "second",
      "cannotActivateWhenDigivolving",
      EffectDuration.UntilOpponentTurnEnd,
    );
    expect(modifyDP).toHaveBeenCalledWith("second", -3000, EffectDuration.UntilOpponentTurnEnd);
  });
});
