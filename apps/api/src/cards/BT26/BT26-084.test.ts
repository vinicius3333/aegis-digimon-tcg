import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, SubTriggerInstall } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const CARD_ID = "BT26-084";

function fakeDef(cardId: string): CardDefinition {
  const option = cardId === "seven-option";
  const sevenCode = cardId.startsWith("seven-");
  return {
    cardId,
    set: "BT26",
    nameEn: cardId,
    kinds: [option ? CardKind.Option : CardKind.Digimon],
    colors: ["White"] as never,
    playCost: option ? 5 : 4,
    dp: option ? 0 : 4000,
    evoCosts: [],
    maxCountInDeck: 4,
    types: sevenCode ? ["Seven Code"] : ["Machine"],
  };
}

function makeHarness(options: { reveal: string[]; pick?: string; deckChoice?: number }) {
  const self = { permanentId: "copipemon", linked: [], stack: [] };
  const players = [{ seat: 0 as Seat, battleArea: [self], hand: [], deck: [] }, { seat: 1 as Seat }];
  const calls: string[] = [];
  const subscriptions: SubTriggerInstall[] = [];
  const source = {
    instanceId: "copipemon-card",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef(CARD_ID),
    permanent: () => self,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  } as unknown as CardSource;
  const revealed = options.reveal.map((cardId) => ({ instanceId: `${cardId}-instance`, cardId }));
  const fx = {
    subscribeSubTrigger: vi.fn((sub: SubTriggerInstall) => subscriptions.push(sub)),
    reveal: vi.fn(async () => {
      calls.push("reveal");
      return revealed;
    }),
    returnToHand: vi.fn(async (ids: string[]) => calls.push(`stage:${ids.join(",")}`)),
    playFromHand: vi.fn(async (ids: string[], opts: { costDelta: number }) =>
      calls.push(`play:${ids.join(",")}:${opts.costDelta}`),
    ),
    gainMemory: vi.fn((amount: number) => calls.push(`memory:${amount}`)),
    useOptionFromHand: vi.fn(async (_ctx: EffectContext, id: string, cost: number) => calls.push(`use:${id}:${cost}`)),
    returnToDeck: vi.fn(async (ids: string[], opts: { toTop: boolean }) =>
      calls.push(`rest:${ids.join(",")}:${opts.toTop}`),
    ),
  } as unknown as Primitives;
  const game = {
    player: (seat: Seat) => players[seat],
    opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
    permanentById: () => self,
    definitionOf: (card: { cardId: string }) => fakeDef(card.cardId),
  } as unknown as GameAccess;
  const ask = {
    selectCards: vi.fn(async (_ctx: unknown, request: { candidates: string[] }) =>
      options.pick === undefined ? [] : request.candidates.filter((id) => id === `${options.pick}-instance`),
    ),
    chooseOption: vi.fn(async () => options.deckChoice ?? 0),
  } as unknown as EffectContext["ask"];
  const ctx = { source, trigger: { subjectPermanentId: "copipemon" }, game, fx, ask } as EffectContext;
  return { calls, ctx, source, subscriptions };
}

async function watcher(harness: ReturnType<typeof makeHarness>): Promise<SubTriggerInstall> {
  const effect = getEffectModule(CARD_ID)!
    .effectsForTiming(EffectTiming.None, harness.source)
    .find((candidate) => candidate.effectKey.endsWith("when-linked-reveal-play"))!;
  await effect.resolve(harness.ctx);
  return harness.subscriptions[0]!;
}

describe("BT26-084 Copipemon", () => {
  it("plays a revealed Seven Code card with a positive cost reduction, then returns the rest (Q7126)", async () => {
    const h = makeHarness({ reveal: ["seven-digimon", "plain-a", "plain-b"], pick: "seven-digimon" });
    await (await watcher(h)).run(h.ctx);
    expect(h.calls).toEqual([
      "reveal",
      "stage:seven-digimon-instance",
      "play:seven-digimon-instance:3",
      "rest:plain-a-instance,plain-b-instance:true",
    ]);
  });

  it("fully uses a revealed Option before returning the rest (Q7126/Q7127)", async () => {
    const h = makeHarness({ reveal: ["seven-option", "plain-a"], pick: "seven-option", deckChoice: 1 });
    await (await watcher(h)).run(h.ctx);
    expect(h.calls).toEqual([
      "reveal",
      "stage:seven-option-instance",
      "use:seven-option-instance:5",
      "rest:plain-a-instance:false",
    ]);
    expect(h.ctx.fx.useOptionFromHand).toHaveBeenCalledWith(h.ctx, "seven-option-instance", 5, {
      payCost: true,
      costDelta: 3,
    });
  });

  it("offers only exact Seven Code cards and can return every revealed card when declined", async () => {
    const h = makeHarness({ reveal: ["plain-a", "seven-digimon", "plain-b"] });
    const sub = await watcher(h);
    await sub.run(h.ctx);
    expect(h.ctx.ask.selectCards).toHaveBeenCalledWith(
      h.ctx,
      expect.objectContaining({ candidates: ["seven-digimon-instance"], min: 0, max: 1 }),
    );
    expect(h.calls).toEqual(["reveal", "rest:plain-a-instance,seven-digimon-instance,plain-b-instance:true"]);
  });

  it("matches only this host being linked on its owner's turn and carries an OPT key", async () => {
    const h = makeHarness({ reveal: [] });
    const sub = await watcher(h);
    expect(sub.matches!(h.ctx)).toBe(true);
    expect(sub.matches!({ ...h.ctx, trigger: { subjectPermanentId: "other" } })).toBe(false);
    expect(sub.oncePerTurnKey).toBe(`copipemon-card/${CARD_ID}/when-linked-reveal-play`);
  });

  it("links through the real engine, reveals, and plays a Seven Code Digimon for 1", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-010", as: "linkCard" }],
          deck: [
            { card: "BT26-019", as: "revealedSevenCode" },
            { card: "AD1-001", as: "restOne" },
            { card: "AD1-002", as: "restTwo" },
          ],
          battleArea: [{ card: CARD_ID, as: "copipemon" }],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 1;
    await s.engine.recomputeContinuousEffects();

    const fx = (s.engine as unknown as { primitives: Primitives }).primitives;
    await fx.link(s.perm("copipemon").permanentId, [s.inst("linkCard").instanceId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT26-019"));

    expect(s.perm("copipemon").linked.map((card) => card.cardId)).toEqual(["BT26-010"]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("Q7128 links an eligible non-white Lv.4-or-lower Seven Code card from trash for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-019", as: "appmonHost" }],
          hand: [{ card: CARD_ID, as: "copipemonLink" }],
          trash: [{ card: "BT26-051", as: "recursiveLink" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        targetPermanentId: s.perm("appmonHost").permanentId,
        instanceId: s.inst("copipemonLink").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("appmonHost").linked.length === 2);

    expect(s.state.memory).toBe(0);
    expect(s.perm("appmonHost").linked.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("recursiveLink").instanceId,
      s.inst("copipemonLink").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("Q7128 puts the host watcher and newly linked card face in one controller-ordered window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "hostCopipemon" }],
          hand: [{ card: CARD_ID, as: "linkedCopipemon" }],
          trash: [{ card: "BT26-019", as: "recursiveLink" }],
          deck: ["BT26-019", "AD1-001", "AD1-002"],
        },
      },
      { autoOrderTriggers: false, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const fx = (s.engine as unknown as { primitives: Primitives }).primitives;
    const linking = fx.link(s.perm("hostCopipemon").permanentId, [s.inst("linkedCopipemon").instanceId]);
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");

    const decision = s.decisions.at(-1)!.req;
    expect(decision.options?.triggerKeys).toEqual(
      expect.arrayContaining([
        expect.stringContaining("this Digimon gets linked"),
        expect.stringContaining("linked face [When Linking]"),
      ]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: {
          kind: "orderTriggers",
          order: [decision.options!.triggerKeys!.find((key) => key.includes("this Digimon gets linked"))!],
        },
      }),
    ).toEqual({ ok: true });
    await linking;
  });
});
