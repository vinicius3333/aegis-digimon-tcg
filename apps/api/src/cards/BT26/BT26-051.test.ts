import {
  CardColor,
  CardKind,
  EffectDuration,
  EffectTiming,
  digivolutionRequirementsFor,
  type CardDefinition,
  type CardInstance,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, SubTriggerInstall } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const CARD_ID = "BT26-051";

function definition(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: overrides.cardId ?? "TEST",
    set: overrides.set ?? "TEST",
    nameEn: overrides.nameEn ?? "Fixture",
    colors: overrides.colors ?? [CardColor.Black],
    kinds: overrides.kinds ?? [CardKind.Digimon],
    playCost: overrides.playCost ?? 0,
    dp: overrides.dp ?? 0,
    evoCosts: overrides.evoCosts ?? [],
    maxCountInDeck: overrides.maxCountInDeck ?? 4,
    types: overrides.types ?? [],
    ...overrides,
  };
}

function instance(instanceId: string, cardId: string): CardInstance {
  return { instanceId, cardId, ownerSeat: 0 as Seat, faceUp: true } as CardInstance;
}

function source(host?: Permanent): CardSource {
  return {
    instanceId: "gomimon-card",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: definition({
      cardId: CARD_ID,
      forms: ["Stnd.", "Appmon"],
      attributes: ["Tool"],
      types: ["Trashbin (App Name)", "Seven Code"],
    }),
    permanent: () => host,
    isOnBattleArea: () => host !== undefined,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-051 Gomimon", () => {
  it("uses the exact Lv.2 [Appmon] cost-0 evolution path and rejects a same-level near-match", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 2,
      traits: ["Appmon"],
      cost: 0,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        breeding: { card: "BT21-005", as: "swipemon" },
        hand: [{ card: CARD_ID, as: "gomimon" }],
        deck: ["BT1-009"],
      },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("swipemon").permanentId,
        instanceId: legal.inst("gomimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("swipemon").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("swipemon").stack.map(({ cardId }) => cardId)).toEqual(["BT21-005"]);

    const illegal = setupEngine({
      0: {
        breeding: { card: "BT1-007", as: "plainGreenEgg" },
        hand: [{ card: CARD_ID, as: "gomimon" }],
      },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("plainGreenEgg").permanentId,
        instanceId: illegal.inst("gomimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("links through the public action, pays cost 1, and grants Collision only when this Gomimon is linked", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gomimon" },
            { card: "BT21-009", as: "socialTarget" },
            { card: "BT25-045", as: "nonMatchingAppmon" },
          ],
          hand: [{ card: "P-190", as: "linkCard" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: prefer },
    );
    s.state.memory = 1;
    prefer.push(s.perm("socialTarget").permanentId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("linkCard").instanceId,
        targetPermanentId: s.perm("gomimon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("socialTarget"), "Collision"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("gomimon").linked.map(({ instanceId }) => instanceId)).toContain(s.inst("linkCard").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("socialTarget"), "Collision")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("nonMatchingAppmon"), "Collision")).toBe(false);

    // A second matching event for this same physical Gomimon is over its turn budget.
    prefer.splice(0, prefer.length, s.perm("gomimon").permanentId);
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("gomimon").permanentId });
    expect(observe(s.engine).hasKeyword(s.perm("gomimon"), "Collision")).toBe(false);
  });

  it("does not react when another Appmon is linked or during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "gomimon" },
          { card: "BT21-009", as: "otherAppmon" },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("otherAppmon").permanentId });
    expect(observe(s.engine).hasKeyword(s.perm("gomimon"), "Collision")).toBe(false);

    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("gomimon").permanentId });
    expect(observe(s.engine).hasKeyword(s.perm("gomimon"), "Collision")).toBe(false);
  });

  it("gives separate Gomimon copies independent once-per-turn budgets", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "firstGomimon" },
            { card: CARD_ID, as: "secondGomimon" },
            { card: "BT21-009", as: "firstTarget" },
            { card: "P-190", as: "secondTarget" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: prefer },
    );
    await s.ready();

    prefer.push(s.perm("firstTarget").permanentId);
    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("firstGomimon").permanentId,
    });
    prefer.splice(0, prefer.length, s.perm("secondTarget").permanentId);
    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("secondGomimon").permanentId,
    });

    expect(observe(s.engine).hasKeyword(s.perm("firstTarget"), "Collision")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("secondTarget"), "Collision")).toBe(true);
  });

  it("offers only own nonbreeding Digimon with exact eligible traits and grants both effects for the turn", async () => {
    const host = {
      permanentId: "host",
      controllerSeat: 0 as Seat,
      topCard: instance("gomimon-card", CARD_ID),
      inBreeding: false,
    } as unknown as Permanent;
    const permanents = [
      ["social", "SOCIAL", false],
      ["tool", "TOOL", false],
      ["open", "OPEN", false],
      ["seven", "SEVEN", false],
      ["near", "NEAR", false],
      ["breeding", "SOCIAL", true],
      ["tamer", "SOCIAL-TAMER", false],
    ].map(
      ([permanentId, cardId, inBreeding]) =>
        ({
          permanentId,
          controllerSeat: 0 as Seat,
          topCard: instance(`${permanentId}-card`, cardId as string),
          inBreeding,
        }) as unknown as Permanent,
    );
    const definitions: Record<string, CardDefinition> = {
      [CARD_ID]: definition({ cardId: CARD_ID, attributes: ["Tool"], types: ["Seven Code"] }),
      SOCIAL: definition({ cardId: "SOCIAL", attributes: ["Social"] }),
      TOOL: definition({ cardId: "TOOL", attributes: ["Tool"] }),
      OPEN: definition({ cardId: "OPEN", attributes: ["Open"] }),
      SEVEN: definition({ cardId: "SEVEN", types: ["Seven Code"] }),
      NEAR: definition({ cardId: "NEAR", attributes: ["Social Media"] }),
      "SOCIAL-TAMER": definition({ cardId: "SOCIAL-TAMER", kinds: [CardKind.Tamer], attributes: ["Social"] }),
    };
    let subscription: SubTriggerInstall | undefined;
    const cardSource = source(host);
    const staticCtx = {
      source: cardSource,
      fx: {
        subscribeSubTrigger: vi.fn((install: SubTriggerInstall) => {
          subscription = install;
          return "watcher";
        }),
      } as unknown as Primitives,
    } as unknown as EffectContext;
    await getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.None, cardSource)[0]!.resolve(staticCtx);

    const chooseTargets = vi.fn(async () => ["open"]);
    const grantKeyword = vi.fn();
    const modifyDP = vi.fn();
    const subCtx = {
      source: cardSource,
      trigger: { subjectPermanentId: host.permanentId },
      game: {
        player: () => ({ battleArea: [host, ...permanents] }),
        definitionOf: (card: CardInstance) => definitions[card.cardId] ?? definition({ cardId: card.cardId }),
      } as unknown as GameAccess,
      ask: { chooseTargets },
      fx: { grantKeyword, modifyDP } as unknown as Primitives,
    } as unknown as EffectContext;

    expect(subscription!.oncePerTurnKey).toBe(`${cardSource.instanceId}/${CARD_ID}/when-linked-collision-dp`);
    await subscription!.run(subCtx);

    expect(chooseTargets).toHaveBeenCalledWith(subCtx, {
      candidates: ["host", "social", "tool", "open", "seven"],
      min: 1,
      max: 1,
    });
    expect(grantKeyword).toHaveBeenCalledWith("open", "Collision", EffectDuration.UntilEachTurnEnd);
    expect(modifyDP).toHaveBeenCalledWith("open", 3000, EffectDuration.UntilEachTurnEnd);
  });

  it("does nothing when the mandatory target pool is empty", async () => {
    const host = {
      permanentId: "host",
      controllerSeat: 0 as Seat,
      topCard: instance("gomimon-card", CARD_ID),
      inBreeding: false,
    } as unknown as Permanent;
    const cardSource = source(host);
    let subscription: SubTriggerInstall | undefined;
    const staticCtx = {
      source: cardSource,
      fx: {
        subscribeSubTrigger: vi.fn((install: SubTriggerInstall) => {
          subscription = install;
          return "watcher";
        }),
      } as unknown as Primitives,
    } as unknown as EffectContext;
    await getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.None, cardSource)[0]!.resolve(staticCtx);

    const grantKeyword = vi.fn();
    const modifyDP = vi.fn();
    await subscription!.run({
      source: cardSource,
      game: {
        player: () => ({ battleArea: [] }),
      } as unknown as GameAccess,
      fx: { grantKeyword, modifyDP } as unknown as Primitives,
    } as unknown as EffectContext);

    expect(grantKeyword).not.toHaveBeenCalled();
    expect(modifyDP).not.toHaveBeenCalled();
  });

  it("public linkCard resolves linked-face De-Digivolve 2 in the same window", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "appmonHost" }],
        hand: [{ card: CARD_ID, as: "gomimonLink" }],
      },
      1: {
        battleArea: [
          {
            card: "BT26-014",
            as: "opponentStack",
            under: [
              { card: "BT1-009", as: "bottom" },
              { card: "BT26-012", as: "middle" },
            ],
          },
          { card: "BT26-090", as: "opponentTamer" },
        ],
      },
    });
    s.state.memory = 3;
    const originalTopId = s.perm("opponentStack").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("gomimonLink").instanceId,
        targetPermanentId: s.perm("appmonHost").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.perm("appmonHost").linked.some((card) => card.instanceId === s.inst("gomimonLink").instanceId),
    );
    await settle(() => s.perm("opponentStack").topCard.cardId === "BT1-009");

    expect(s.state.memory).toBe(0);
    expect(s.perm("appmonHost").linked[0]).toMatchObject({
      instanceId: s.inst("gomimonLink").instanceId,
      faceUp: true,
    });
    expect(s.perm("opponentStack").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("middle").instanceId, originalTopId]),
    );
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT26-090")).toBe(true);
  });

  it("installs a linked-only watcher that matches only this physical Gomimon's linking operation", async () => {
    const host = {
      permanentId: "host",
      controllerSeat: 0 as Seat,
      topCard: instance("host-card", "BT21-009"),
    } as unknown as Permanent;
    const cardSource = source(host);
    const installed: SubTriggerInstall[] = [];
    const linkedEffect = getEffectModule(CARD_ID)!
      .effectsForTiming(EffectTiming.None, cardSource)
      .find((effect) => effect.effectKey.endsWith("link-face-when-linking-de-digivolve"))!;

    expect(linkedEffect.isLinked).toBe(true);
    await linkedEffect.resolve({
      source: cardSource,
      fx: {
        subscribeSubTrigger: (watcher: SubTriggerInstall) => installed.push(watcher),
      } as unknown as Primitives,
    } as unknown as EffectContext);

    expect(installed).toHaveLength(1);
    expect(
      installed[0]!.matches!({ trigger: { linkedCardInstanceIds: [cardSource.instanceId] } } as EffectContext),
    ).toBe(true);
    expect(installed[0]!.matches!({ trigger: { linkedCardInstanceIds: ["another-link"] } } as EffectContext)).toBe(
      false,
    );
  });
});
