import { describe, it, expect, vi } from "vitest";
import { EffectTiming, appFusionCostFor, assemblyRequirementFor, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT26-037.js";
import "../index.js";

// A3 for BT26-037 (Weatherdramon, BT26): "[On Play] [When Digivolving] You may link 1
// level 3 Digimon card with the [Navi], [System] or [Seven Code] trait from this
// Digimon's digivolution cards to this Digimon without paying the cost."
//
// FAILS-WHEN-REVERTED: dropping the trait filter (no eligible candidate) leaves the
// link primitive uncalled; this test asserts it fires with exactly the eligible card.

const CARD_ID = "BT26-037";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? "AD1-001",
    set: "BT26",
    nameEn: over.nameEn ?? "Test",
    kinds: (over.kinds as never) ?? (["Digimon"] as never),
    colors: (over.colors as never) ?? ([] as never),
    playCost: over.playCost ?? 0,
    dp: over.dp ?? 0,
    level: over.level,
    types: over.types ?? [],
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(stack: { instanceId: string; cardId: string }[]): CardSource {
  return {
    instanceId: "weatherdramon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID }),
    permanent: () => ({ permanentId: "weatherdramon-perm", stack }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT26-037 [On Play]/[When Digivolving]: link a level-3 eligible-trait digivolution card", () => {
  it("exposes all 6 legal App Fusion pairs and the exact Assembly -2 recipe", () => {
    const names = ["Weathermon", "Rocketmon", "Newsmon"];
    for (const topName of names) {
      for (const linkedName of names.filter((name) => name !== topName)) {
        expect(appFusionCostFor(CARD_ID, { topName, linkedNames: [linkedName] })).toBe(0);
      }
    }
    expect(appFusionCostFor(CARD_ID, { topName: "Weathermon", linkedNames: ["Weathermon"] })).toBeUndefined();
    expect(assemblyRequirementFor(CARD_ID)).toEqual([
      { reduceCost: 2, materials: [{ traits: ["Navi", "System", "Seven Code"], level: 3, count: 1 }] },
    ]);
  });

  it("plays through Assembly for cost 3 and links its valid material for free on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "weatherdramon" }],
          trash: [{ card: "BT21-047", as: "navimon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("weatherdramon").instanceId,
        assembly: { materialInstanceIds: [s.inst("navimon").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.linked.some((card) => card.cardId === "BT21-047")),
    );

    const weatherdramon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === CARD_ID)!;
    expect(s.state.memory).toBe(0);
    expect(weatherdramon.stack).toHaveLength(0);
    expect(weatherdramon.linked.map((card) => card.cardId)).toEqual(["BT21-047"]);
    expect(observe(s.engine).hasKeyword(weatherdramon, "Blocker")).toBe(true);
  });

  it("digivolves for 2 and links the eligible Lv.3 source during When Digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-047", as: "navimon" }],
          hand: [{ card: CARD_ID, as: "weatherdramon" }],
          deck: ["BT5-022"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("navimon").permanentId,
        instanceId: s.inst("weatherdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("navimon").linked.some((card) => card.cardId === "BT21-047"));
    expect(s.state.memory).toBe(0);
    expect(s.perm("navimon").topCard.cardId).toBe(CARD_ID);
  });

  it("offers only the eligible ([Navi]/[System]/[Seven Code]) stack card and links it", async () => {
    const eligible = { instanceId: "stack-eligible", cardId: "NAVI-003" };
    const sameTraitWithoutLink = { instanceId: "stack-no-link", cardId: "NAVI-004" };
    const ineligible = { instanceId: "stack-ineligible", cardId: "OTHER-003" };
    const source = makeSource([eligible, sameTraitWithoutLink, ineligible]);

    const game: GameAccess = {
      definitionOf: (card: { cardId: string }) =>
        fakeDef({
          cardId: card.cardId,
          level: 3,
          types: card.cardId === "NAVI-003" || card.cardId === "NAVI-004" ? ["Navi"] : [],
          linkRequirement: card.cardId === "NAVI-003" ? "[Link] [Appmon] trait: Cost 1" : undefined,
        }),
    } as unknown as GameAccess;

    const linked: string[][] = [];
    const fx = {
      link: vi.fn<(...args: any[]) => any>(async (_targetId: string, ids: string[]) => {
        linked.push(ids);
        return ids;
      }),
    } as unknown as Primitives;

    const ask = {
      selectCards: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, opts: { candidates: string[] }) => [
        opts.candidates[0]!,
      ]),
    } as unknown as EffectContext["ask"];

    const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;

    const module = getEffectModule(CARD_ID);
    expect(module).toBeDefined();
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    const linkEffect = effects.find((e) => e.effectKey === `${CARD_ID}/on-play-link`);
    expect(linkEffect).toBeDefined();

    await linkEffect!.resolve(ctx);

    expect(linked).toEqual([["stack-eligible"]]);
  });

  it("public linkCard resolves its linked-face When Linking as an immediate standard battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "appmonHost" }],
          hand: [{ card: CARD_ID, as: "weatherdramonLink" }],
        },
        1: {
          battleArea: [
            { card: "BT10-073", as: "opponentDigimon", dp: 1000 },
            { card: "BT26-090", as: "opponentTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("weatherdramonLink").instanceId,
        targetPermanentId: s.perm("appmonHost").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("appmonHost").linked.some((card) => card.cardId === CARD_ID));
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT10-073"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("appmonHost").linked[0]).toMatchObject({
      instanceId: s.inst("weatherdramonLink").instanceId,
      faceUp: true,
    });
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT10-073")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT26-090")).toBe(true);
  });

  it("may decline the linked-face battle without changing either Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "appmonHost" }],
          hand: [{ card: CARD_ID, as: "weatherdramonLink" }],
        },
        1: { battleArea: [{ card: "BT10-073", as: "opponentDigimon", dp: 1000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("weatherdramonLink").instanceId,
        targetPermanentId: s.perm("appmonHost").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("appmonHost").linked.length === 1);

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("appmonHost").permanentId),
    ).toBe(true);
    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.permanentId === s.perm("opponentDigimon").permanentId,
      ),
    ).toBe(true);
  });

  it("installs a linked-only watcher that matches only the operation containing this physical card", async () => {
    const source = makeSource([]);
    const installed: Array<Parameters<Primitives["subscribeSubTrigger"]>[0]> = [];
    const linkedEffect = getEffectModule(CARD_ID)!
      .effectsForTiming(EffectTiming.None, source)
      .find((effect) => effect.effectKey.endsWith("link-face-when-linking-battle"))!;

    expect(linkedEffect.isLinked).toBe(true);
    await linkedEffect.resolve({
      source,
      fx: {
        subscribeSubTrigger: (watcher: Parameters<Primitives["subscribeSubTrigger"]>[0]) => installed.push(watcher),
      } as unknown as Primitives,
    } as unknown as EffectContext);

    expect(installed).toHaveLength(1);
    expect(installed[0]!.event).toBe("whenLinked");
    expect(installed[0]!.matches!({ trigger: { linkedCardInstanceIds: [source.instanceId] } } as EffectContext)).toBe(
      true,
    );
    expect(installed[0]!.matches!({ trigger: { linkedCardInstanceIds: ["other-link"] } } as EffectContext)).toBe(false);
  });
});
