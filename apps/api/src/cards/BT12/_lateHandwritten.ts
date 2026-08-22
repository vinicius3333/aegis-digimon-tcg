import {
  CardKind,
  EffectDuration,
  EffectTiming,
  filterToDistinctColors,
  isDigimon,
  isTamer,
  type CardDefinition,
  type CardInstance,
  type Permanent,
} from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import {
  activated,
  colorWaiverStatic,
  beforePayCost,
  inTrash,
  onDeletion,
  onPlay,
  security,
  staticModifier,
  turnTiming,
  whenDigivolving,
} from "../../engine/effects/builders.js";
import { registerWouldBePlayedSelfReducer } from "../../engine/effects/interpreter.js";

registerWouldBePlayedSelfReducer("BT12-112", {
  amount: 1,
  raw: "By placing 1 of your [Shoutmon] as a digivolution card under this Digimon, reduce its play cost by 1.",
  pay: async (ctx) => {
    const candidates = ctx.game
      .player(ctx.source.ownerSeat)
      .battleArea.filter(
        (permanent) =>
          permanent.topCard !== undefined &&
          isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
          ctx.game.definitionOf(permanent.topCard).nameEn.includes("Shoutmon"),
      );
    const chosen = await choosePermanent(ctx, candidates);
    if (chosen === undefined) return false;
    ctx.pendingSelfReducerRelocations = [...(ctx.pendingSelfReducerRelocations ?? []), chosen];
    return true;
  },
});

function text(definition: CardDefinition): string {
  return `${definition.nameEn} ${(definition.types ?? []).join(" ")} ${definition.effectText ?? ""} ${definition.inheritedEffectText ?? ""}`;
}

function hasText(definition: CardDefinition, token: string): boolean {
  return text(definition).toLowerCase().includes(token.toLowerCase());
}

function myPermanents(
  ctx: EffectContext,
  source: CardSource,
  predicate: (definition: CardDefinition, permanent: Permanent) => boolean,
): Permanent[] {
  return ctx.game
    .player(source.ownerSeat)
    .battleArea.filter(
      (permanent) => permanent.topCard !== undefined && predicate(ctx.game.definitionOf(permanent.topCard), permanent),
    );
}

function opposingDigimon(
  ctx: EffectContext,
  source: CardSource,
  predicate: (definition: CardDefinition, permanent: Permanent) => boolean = () => true,
): Permanent[] {
  return ctx.game
    .player(ctx.game.opponentOf(source.ownerSeat))
    .battleArea.filter(
      (permanent) =>
        permanent.topCard !== undefined &&
        isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
        predicate(ctx.game.definitionOf(permanent.topCard), permanent),
    );
}

async function choosePermanent(
  ctx: EffectContext,
  candidates: Permanent[],
  optional = false,
): Promise<string | undefined> {
  if (candidates.length === 0) return undefined;
  const [picked] = await ctx.ask.chooseTargets(ctx, {
    candidates: candidates.map(({ permanentId }) => permanentId),
    min: optional ? 0 : 1,
    max: 1,
  });
  return picked;
}

async function chooseCard(ctx: EffectContext, cards: CardInstance[], optional = false): Promise<string | undefined> {
  if (cards.length === 0) return undefined;
  const [picked] = await ctx.ask.selectCards(ctx, {
    candidates: cards.map(({ instanceId }) => instanceId),
    min: optional ? 0 : 1,
    max: 1,
    visibleCards: cards.map(({ instanceId, cardId }) => ({ instanceId, cardId })),
  });
  return picked;
}

function tamerSecurity(source: CardSource, cardId: string): Effect {
  return security({
    source,
    effectKey: `${cardId}/security-play`,
    description: "[Security] Play this card without paying its cost.",
    resolve: async (ctx) => {
      await ctx.fx.playInstances([source.instanceId], { payCost: false });
    },
  });
}

function _addSelfSecurity(source: CardSource, cardId: string): Effect {
  return security({
    source,
    effectKey: `${cardId}/security-hand`,
    description: "[Security] Add this card to its owner's hand.",
    resolve: async (ctx) => {
      await ctx.fx.returnToHand([source.instanceId]);
    },
  });
}

async function revealSave(ctx: EffectContext, source: CardSource, count: number, max: number): Promise<void> {
  const revealed = await ctx.fx.reveal(source.ownerSeat, count);
  const eligible = revealed.filter(
    (card) => isDigimon(ctx.game.definitionOf(card)) && hasText(ctx.game.definitionOf(card), "save"),
  );
  const selected = await ctx.ask.selectCards(ctx, {
    candidates: eligible.map(({ instanceId }) => instanceId),
    min: 0,
    max: Math.min(max, eligible.length),
    differentColors: true,
    visibleCards: revealed.map(({ instanceId, cardId }) => ({ instanceId, cardId })),
  });
  const selectedCards = eligible.filter(({ instanceId }) => selected.includes(instanceId));
  const legalSelected = filterToDistinctColors(selectedCards, (card) => ctx.game.definitionOf(card).colors).map(
    ({ instanceId }) => instanceId,
  );
  if (legalSelected.length > 0) await ctx.fx.returnToHand(legalSelected);
  const rest = revealed.map(({ instanceId }) => instanceId).filter((id) => !legalSelected.includes(id));
  if (rest.length > 0) await ctx.fx.returnToDeck(rest, { toTop: false });
}

async function placeSaveFromHand(ctx: EffectContext, source: CardSource): Promise<boolean> {
  const cards = ctx.game
    .player(source.ownerSeat)
    .hand.filter((card) => isDigimon(ctx.game.definitionOf(card)) && hasText(ctx.game.definitionOf(card), "save"));
  const picked = await chooseCard(ctx, cards, true);
  const self = source.permanent();
  if (picked === undefined || self === undefined) return false;
  return (await ctx.fx.placeUnder(self.permanentId, [picked])).length === 1;
}

function saveTamerStart(cardId: string, source: CardSource, result: "draw" | "memory" | "buff" | "debuff"): Effect {
  return turnTiming({
    source,
    effectKey: `${cardId}/start-main`,
    description:
      "[Start of Your Main Phase] Place a Save Digimon from hand under this Tamer to apply this card's effect.",
    optional: true,
    resolve: async (ctx) => {
      if (!(await placeSaveFromHand(ctx, source))) return;
      if (result === "draw") await ctx.fx.draw(source.ownerSeat, 1);
      if (result === "memory") ctx.fx.gainMemory(1);
      if (result === "buff") {
        const id = await choosePermanent(
          ctx,
          myPermanents(ctx, source, (d) => isDigimon(d)),
        );
        if (id) ctx.fx.modifyDP(id, 2000, EffectDuration.UntilEachTurnEnd);
      }
      if (result === "debuff") {
        const id = await choosePermanent(ctx, opposingDigimon(ctx, source));
        if (id) ctx.fx.modifyDP(id, -2000, EffectDuration.UntilEachTurnEnd);
      }
    },
  });
}

function saveTamerDigivolveReducer(cardId: string, source: CardSource): Effect {
  return staticModifier({
    source,
    effectKey: `${cardId}/save-digivolve-reducer`,
    description:
      "Suspend this Tamer and place a card from under one of your Tamers under the evolving Save Digimon to reduce its cost by 1.",
    when: () => source.isOwnersTurn(),
    resolve: async (ctx) => {
      const self = source.permanent();
      if (!self) return;
      ctx.fx.subscribeReplacement({
        event: "wouldDigivolve",
        sourcePermanentId: self.permanentId,
        mode: "reduceCost",
        amount: 1,
        controllerSeat: source.ownerSeat,
        description: `${cardId}: Save digivolution cost -1`,
        appliesTo: (target) => target.controllerSeat === source.ownerSeat && !target.inBreeding,
        intoMatches: (definition) => isDigimon(definition) && hasText(definition, "save"),
        activate: async (runtimeCtx, target) => {
          const cards: CardInstance[] = [];
          for (const permanent of myPermanents(runtimeCtx, source, (definition) => isTamer(definition))) {
            cards.push(...permanent.stack);
          }
          if (self.isSuspended || cards.length === 0) return false;
          if (!(await runtimeCtx.ask.optional(runtimeCtx, "Pay the Tamer's cost to reduce digivolution by 1?")))
            return false;
          const picked = await chooseCard(runtimeCtx, cards);
          if (!picked || runtimeCtx.fx.payActivationCost?.(self.permanentId, "suspend") !== true) return false;
          return (await runtimeCtx.fx.placeUnder(target.permanentId, [picked])).length === 1;
        },
      });
    },
  });
}

function _optionMainInSecurity(
  cardId: string,
  source: CardSource,
  resolve: (ctx: EffectContext) => Promise<void>,
): Effect {
  return security({
    source,
    effectKey: `${cardId}/security-main`,
    description: "[Security] Activate this card's [Main] effect.",
    resolve,
  });
}

function _deleteByDp(cardId: string, source: CardSource, limit: number, isSecurity = false): Effect {
  const make = isSecurity ? security : activated;
  return make({
    source,
    effectKey: `${cardId}/${isSecurity ? "security" : "main"}-delete`,
    description: `Delete 1 opposing Digimon with ${limit} DP or less.`,
    resolve: async (ctx) => {
      const id = await choosePermanent(
        ctx,
        opposingDigimon(ctx, source, (_d, p) => p.currentDP <= limit),
      );
      if (id) await ctx.fx.deletePermanent([id], "byEffect");
    },
  });
}

function lowestLevel(ctx: EffectContext, source: CardSource): Permanent[] {
  const candidates = opposingDigimon(ctx, source, (definition) => definition.level !== undefined);
  const minimum = Math.min(
    ...candidates.map((permanent) => ctx.game.definitionOf(permanent.topCard!).level ?? Infinity),
  );
  return candidates.filter((permanent) => ctx.game.definitionOf(permanent.topCard!).level === minimum);
}

export function lateBt12Module(cardId: string): EffectModule {
  return {
    cardId,
    effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
      switch (cardId) {
        case "BT12-082": {
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/recover-x-antibody`,
                description: "Return an X Antibody card from trash to hand.",
                resolve: async (ctx) => {
                  const card = await chooseCard(
                    ctx,
                    ctx.game
                      .player(source.ownerSeat)
                      .trash.filter((item) => hasText(ctx.game.definitionOf(item), "x antibody")),
                    true,
                  );
                  if (card) await ctx.fx.returnToHand([card]);
                },
              }),
              whenDigivolving({
                source,
                effectKey: `${cardId}/mill-or-delete`,
                description:
                  "Trash 3 cards, or delete a level 4 or lower Digimon when Baalmon/X Antibody is in the stack.",
                resolve: async (ctx) => {
                  const self = source.permanent();
                  const enhanced = self?.stack.some(
                    (item) =>
                      ctx.game.definitionOf(item).nameEn.includes("Baalmon") ||
                      hasText(ctx.game.definitionOf(item), "x antibody"),
                  );
                  if (enhanced) {
                    const id = await choosePermanent(
                      ctx,
                      opposingDigimon(ctx, source, (d) => (d.level ?? Infinity) <= 4),
                    );
                    if (id) await ctx.fx.deletePermanent([id], "byEffect");
                  } else {
                    const cards = ctx.game
                      .player(source.ownerSeat)
                      .deck.slice(0, 3)
                      .map(({ instanceId }) => instanceId);
                    if (cards.length) await ctx.fx.trash(cards, { byEffectSeat: source.ownerSeat });
                  }
                },
              }),
            ];
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/inherited-dp`,
                description: "Wizard/Demon Lord host gets +2000 DP on your turn.",
                isInherited: true,
                when: (ctx) => {
                  const top = source.permanent()?.topCard;
                  return (
                    source.isOwnersTurn() &&
                    top !== undefined &&
                    (hasText(ctx.game.definitionOf(top), "wizard") || hasText(ctx.game.definitionOf(top), "demon lord"))
                  );
                },
                resolve: async (ctx) => {
                  const host = source.permanent();
                  if (host) ctx.fx.modifyDP(host.permanentId, 2000, EffectDuration.Permanent);
                },
              }),
            ];
          return [];
        }
        case "BT12-084": {
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/armor-purge`,
                description: "Armor Purge",
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (self) ctx.fx.grantKeyword(self.permanentId, "ArmorPurge", EffectDuration.Permanent);
                },
              }),
            ];
          if (timing === EffectTiming.OnPlay || timing === EffectTiming.WhenDigivolving)
            return [
              (timing === EffectTiming.OnPlay ? onPlay : whenDigivolving)({
                source,
                effectKey: `${cardId}/add-xros-heart`,
                description:
                  "Place a Xros Heart Digimon under this Digimon; Sparrowmon grants team protection and Blocker.",
                optional: true,
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  const pool = [...ctx.game.player(source.ownerSeat).hand];
                  for (const p of ctx.game.player(source.ownerSeat).battleArea)
                    if (p.topCard && isTamer(ctx.game.definitionOf(p.topCard))) pool.push(...p.stack);
                  const card = await chooseCard(
                    ctx,
                    pool.filter(
                      (item) =>
                        isDigimon(ctx.game.definitionOf(item)) && hasText(ctx.game.definitionOf(item), "xros heart"),
                    ),
                    true,
                  );
                  if (card) await ctx.fx.placeUnder(self.permanentId, [card]);
                  if (self.stack.some((item) => ctx.game.definitionOf(item).nameEn.includes("Sparrowmon")))
                    for (const p of myPermanents(ctx, source, (d) => isDigimon(d))) {
                      ctx.fx.grantKeyword(p.permanentId, "Blocker", EffectDuration.UntilOpponentTurnEnd);
                      ctx.fx.restrict(p.permanentId, "beReturned", EffectDuration.UntilOpponentTurnEnd);
                    }
                },
              }),
            ];
          if (timing === EffectTiming.OnDestroyedAnyone)
            return [
              turnTiming({
                source,
                effectKey: `${cardId}/unsuspend`,
                description: "[All Turns][Once Per Turn] Unsuspend when another Digimon is deleted.",
                maxPerTurn: 1,
                when: (ctx) =>
                  ctx.trigger.deletedPermanentId !== undefined &&
                  ctx.trigger.deletedPermanentId !== source.permanent()?.permanentId,
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (self) await ctx.fx.unsuspend([self.permanentId]);
                },
              }),
            ];
          return [];
        }
        case "BT12-085": {
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/security-trash`,
                description:
                  "Trash opposing security per 10 cards in your trash when Beelzemon/X Antibody is in sources.",
                when: (ctx) =>
                  source
                    .permanent()
                    ?.stack.some(
                      (item) =>
                        ctx.game.definitionOf(item).nameEn.includes("Beelzemon") ||
                        hasText(ctx.game.definitionOf(item), "x antibody"),
                    ) ?? false,
                resolve: async (ctx) => {
                  const amount = Math.floor(ctx.game.player(source.ownerSeat).trash.length / 10);
                  if (amount)
                    await ctx.fx.trashFromSecurity(ctx.game.opponentOf(source.ownerSeat), amount, { fromTop: true });
                },
              }),
            ];
          if (timing === EffectTiming.OnDestroyedAnyone)
            return [
              onDeletion({
                source,
                effectKey: `${cardId}/play-impmon`,
                description: "Play an Impmon from trash for free.",
                optional: true,
                resolve: async (ctx) => {
                  const card = await chooseCard(
                    ctx,
                    ctx.game
                      .player(source.ownerSeat)
                      .trash.filter((item) => ctx.game.definitionOf(item).nameEn.includes("Impmon")),
                    true,
                  );
                  if (card) await ctx.fx.playInstances([card], { payCost: false });
                },
              }),
            ];
          return [];
        }
        case "BT12-086": {
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/blocker`,
                description: "Blocker",
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (self) ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.Permanent);
                },
              }),
              staticModifier({
                source,
                effectKey: `${cardId}/inherited-jamming`,
                description: "Save host gains Jamming on your turn.",
                isInherited: true,
                when: (ctx) => {
                  const top = source.permanent()?.topCard;
                  return source.isOwnersTurn() && top !== undefined && hasText(ctx.game.definitionOf(top), "save");
                },
                resolve: async (ctx) => {
                  const host = source.permanent();
                  if (host) ctx.fx.grantKeyword(host.permanentId, "Jamming", EffectDuration.Permanent);
                },
              }),
            ];
          if (timing === EffectTiming.OnPlay)
            return [
              onPlay({
                source,
                effectKey: `${cardId}/reveal`,
                description: "Reveal 3 and add up to 2 differently colored Save Digimon.",
                resolve: (ctx) => revealSave(ctx, source, 3, 2),
              }),
            ];
          if (timing === EffectTiming.OnDestroyedAnyone)
            return [
              onDeletion({
                source,
                effectKey: `${cardId}/save`,
                description: "Save",
                optional: true,
                resolve: async (ctx) => {
                  const tamer = await choosePermanent(
                    ctx,
                    myPermanents(ctx, source, (d) => isTamer(d)),
                    true,
                  );
                  if (tamer) await ctx.fx.placeUnder(tamer, [source.instanceId]);
                },
              }),
            ];
          return [];
        }
        case "BT12-087":
        case "BT12-091":
        case "BT12-093":
        case "BT12-094": {
          if (timing === EffectTiming.None) return [saveTamerDigivolveReducer(cardId, source)];
          if (timing === EffectTiming.OnStartMainPhase)
            return [
              saveTamerStart(
                cardId,
                source,
                cardId === "BT12-087"
                  ? "draw"
                  : cardId === "BT12-091"
                    ? "debuff"
                    : cardId === "BT12-093"
                      ? "buff"
                      : "memory",
              ),
            ];
          if (timing === EffectTiming.SecuritySkill) return [tamerSecurity(source, cardId)];
          return [];
        }
        case "BT12-089": {
          if (timing === EffectTiming.OnStartTurn)
            return [
              turnTiming({
                source,
                effectKey: `${cardId}/memory-setter`,
                description: "Set memory to 3 when at 2 or less.",
                when: () => source.isOwnersTurn(),
                resolve: async (ctx) => {
                  if (ctx.game.state.memory <= 2) ctx.fx.setMemory(3);
                },
              }),
            ];
          if (timing === EffectTiming.SecuritySkill) return [tamerSecurity(source, cardId)];
          if (timing === EffectTiming.OnUseOption)
            return [
              activated({
                source,
                effectKey: `${cardId}/main-gallantmon`,
                description:
                  "Place this Tamer, Growlmon and WarGrowlmon under Guilmon, then digivolve into Gallantmon and give it +2000 DP.",
                maxPerTurn: 1,
                resolve: async (ctx) => {
                  const guilmon = await choosePermanent(
                    ctx,
                    myPermanents(
                      ctx,
                      source,
                      (definition) => isDigimon(definition) && definition.nameEn.includes("Guilmon"),
                    ),
                  );
                  if (!guilmon) return;
                  const trash = ctx.game.player(source.ownerSeat).trash;
                  const growlmon = trash.find((card) => ctx.game.definitionOf(card).nameEn === "Growlmon");
                  const warGrowlmon = trash.find((card) => ctx.game.definitionOf(card).nameEn === "WarGrowlmon");
                  const gallantmon = await chooseCard(
                    ctx,
                    ctx.game
                      .player(source.ownerSeat)
                      .hand.filter(
                        (card) =>
                          isDigimon(ctx.game.definitionOf(card)) &&
                          ctx.game.definitionOf(card).nameEn.includes("Gallantmon"),
                      ),
                    true,
                  );
                  const self = source.permanent();
                  if (!growlmon || !warGrowlmon || !gallantmon || !self) return;
                  if (!ctx.fx.relocatePermanent(guilmon, self.permanentId)) return;
                  await ctx.fx.placeUnder(guilmon, [growlmon.instanceId, warGrowlmon.instanceId]);
                  const evolved = await ctx.fx.digivolveFromInstance(guilmon, gallantmon, {
                    payCost: true,
                    ignoreLevel: true,
                  });
                  if (evolved) ctx.fx.modifyDP(evolved.permanentId, 2000, EffectDuration.UntilEachTurnEnd);
                },
              }),
            ];
          return [];
        }
        case "BT12-092": {
          if (timing === EffectTiming.OnStartMainPhase)
            return [
              turnTiming({
                source,
                effectKey: `${cardId}/become-digimon`,
                description: "Pay 1 to treat Marcus as a 3000 DP Digimon for the turn.",
                optional: true,
                when: (ctx) =>
                  myPermanents(
                    ctx,
                    source,
                    (d) => isDigimon(d) && (d.nameEn.includes("Agumon") || d.nameEn.includes("Greymon")),
                  ).length > 0,
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self || ctx.game.state.memory < 1) return;
                  ctx.fx.gainMemory(-1);
                  ctx.fx.grantKind?.(self.permanentId, [CardKind.Digimon], EffectDuration.UntilEachTurnEnd);
                  ctx.fx.setBaseDP(self.permanentId, 3000, EffectDuration.UntilEachTurnEnd);
                  ctx.fx.restrict(self.permanentId, "digivolve", EffectDuration.UntilEachTurnEnd);
                },
              }),
            ];
          if (timing === EffectTiming.SecuritySkill) return [tamerSecurity(source, cardId)];
          if (timing === EffectTiming.OnTappedAnyone)
            return [
              turnTiming({
                source,
                effectKey: `${cardId}/suspend-digivolve`,
                description:
                  "When this Tamer becomes suspended, digivolve one of your Digimon into a yellow Greymon for free.",
                optional: true,
                when: (ctx) => ctx.trigger.suspendedPermanentId === source.permanent()?.permanentId,
                resolve: async (ctx) => {
                  const base = await choosePermanent(
                    ctx,
                    myPermanents(ctx, source, (d) => isDigimon(d)),
                    true,
                  );
                  if (!base) return;
                  const card = await chooseCard(
                    ctx,
                    ctx.game.player(source.ownerSeat).hand.filter((item) => {
                      const definition = ctx.game.definitionOf(item);
                      return (
                        isDigimon(definition) &&
                        definition.nameEn.includes("Greymon") &&
                        definition.colors.includes("Yellow" as never)
                      );
                    }),
                    true,
                  );
                  if (card) await ctx.fx.digivolveFromInstance(base, card, { payCost: false });
                },
              }),
            ];
          return [];
        }
        case "BT12-095": {
          if (timing === EffectTiming.OnPlay || timing === EffectTiming.OnStartMainPhase)
            return [
              (timing === EffectTiming.OnPlay ? onPlay : turnTiming)({
                source,
                effectKey: `${cardId}/grant-blocker`,
                description: "Give an Agumon/Greymon +1000 DP and Blocker through the opponent's turn.",
                resolve: async (ctx) => {
                  const id = await choosePermanent(
                    ctx,
                    myPermanents(
                      ctx,
                      source,
                      (d) => isDigimon(d) && (d.nameEn.includes("Agumon") || d.nameEn.includes("Greymon")),
                    ),
                  );
                  if (id) {
                    ctx.fx.modifyDP(id, 1000, EffectDuration.UntilOpponentTurnEnd);
                    ctx.fx.grantKeyword(id, "Blocker", EffectDuration.UntilOpponentTurnEnd);
                  }
                },
              }),
            ];
          if (timing === EffectTiming.SecuritySkill) return [tamerSecurity(source, cardId)];
          if (timing === EffectTiming.OnEnterFieldAnyone)
            return [
              turnTiming({
                source,
                effectKey: `${cardId}/digivolve-memory`,
                description: "Suspend this Tamer when your Digimon becomes Greymon/Omnimon to gain 1 memory.",
                optional: true,
                when: (ctx) => {
                  const self = source.permanent();
                  const subject = ctx.trigger.subjectPermanentId
                    ? ctx.game.permanentById(ctx.trigger.subjectPermanentId)
                    : undefined;
                  const top = subject?.topCard;
                  return (
                    self?.isSuspended === false &&
                    subject?.controllerSeat === source.ownerSeat &&
                    top !== undefined &&
                    (ctx.game.definitionOf(top).nameEn.includes("Greymon") ||
                      ctx.game.definitionOf(top).nameEn.includes("Omnimon"))
                  );
                },
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self || self.isSuspended) return;
                  const moved = await ctx.fx.suspend([self.permanentId]);
                  if (moved.length === 1) ctx.fx.gainMemory(1);
                },
              }),
            ];
          return [];
        }
        case "BT12-096": {
          if (timing === EffectTiming.None) return [saveTamerDigivolveReducer(cardId, source)];
          if (timing === EffectTiming.OnStartTurn)
            return [
              turnTiming({
                source,
                effectKey: `${cardId}/memory-setter`,
                description: "Set memory to 3 when at 2 or less.",
                when: () => source.isOwnersTurn(),
                resolve: async (ctx) => {
                  if (ctx.game.state.memory <= 2) ctx.fx.setMemory(3);
                },
              }),
            ];
          if (timing === EffectTiming.SecuritySkill) return [tamerSecurity(source, cardId)];
          return [];
        }
        case "BT12-097": {
          if (timing === EffectTiming.None) return [saveTamerDigivolveReducer(cardId, source)];
          if (timing === EffectTiming.OnStartMainPhase)
            return [
              turnTiming({
                source,
                effectKey: `${cardId}/load-from-trash`,
                description: "If this Tamer has at most 2 cards, place a Save Digimon from trash under it.",
                when: () => (source.permanent()?.stack.length ?? 0) <= 2,
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  const card = await chooseCard(
                    ctx,
                    ctx.game
                      .player(source.ownerSeat)
                      .trash.filter(
                        (item) =>
                          isDigimon(ctx.game.definitionOf(item)) && hasText(ctx.game.definitionOf(item), "save"),
                      ),
                    true,
                  );
                  if (card) await ctx.fx.placeUnder(self.permanentId, [card]);
                },
              }),
            ];
          if (timing === EffectTiming.SecuritySkill) return [tamerSecurity(source, cardId)];
          return [];
        }
        case "BT12-098": {
          if (timing === EffectTiming.OnPlay)
            return [
              onPlay({
                source,
                effectKey: `${cardId}/reveal`,
                description: "Reveal 3; add a Save Digimon and a Hunter card.",
                resolve: async (ctx) => {
                  const revealed = await ctx.fx.reveal(source.ownerSeat, 3);
                  const save = await chooseCard(
                    ctx,
                    revealed.filter(
                      (card) => isDigimon(ctx.game.definitionOf(card)) && hasText(ctx.game.definitionOf(card), "save"),
                    ),
                    true,
                  );
                  const hunter = await chooseCard(
                    ctx,
                    revealed.filter(
                      (card) => card.instanceId !== save && hasText(ctx.game.definitionOf(card), "hunter"),
                    ),
                    true,
                  );
                  const selected = [save, hunter].filter((id): id is string => id !== undefined);
                  if (selected.length) await ctx.fx.returnToHand(selected);
                  const rest = revealed.map(({ instanceId }) => instanceId).filter((id) => !selected.includes(id));
                  if (rest.length) await ctx.fx.returnToDeck(rest, { toTop: false });
                },
              }),
            ];
          if (timing === EffectTiming.OnUseOption)
            return [
              activated({
                source,
                effectKey: `${cardId}/main-sa`,
                description: "Suspend this Tamer to give a Save Digimon Security Attack +1.",
                maxPerTurn: 1,
                canActivate: (ctx) =>
                  myPermanents(ctx, source, (d) => isTamer(d)).length >= 4 && source.permanent()?.isSuspended === false,
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  await ctx.fx.suspend([self.permanentId]);
                  const id = await choosePermanent(
                    ctx,
                    myPermanents(ctx, source, (d) => isDigimon(d) && hasText(d, "save")),
                  );
                  if (id) ctx.fx.grantKeyword(id, "SecurityAttack", EffectDuration.UntilEachTurnEnd, 1);
                },
              }),
            ];
          if (timing === EffectTiming.SecuritySkill) return [tamerSecurity(source, cardId)];
          return [];
        }
        case "BT12-099": {
          if (timing === EffectTiming.OnUseOption)
            return [
              activated({
                source,
                effectKey: `${cardId}/main`,
                description:
                  "Delete an opposing 6000 DP or lower Digimon, then give a Hybrid +3000 DP and let it attack a player.",
                resolve: async (ctx) => {
                  const target = await choosePermanent(
                    ctx,
                    opposingDigimon(ctx, source, (_definition, permanent) => permanent.currentDP <= 6000),
                  );
                  if (target) await ctx.fx.deletePermanent([target], "byEffect");
                  const hybrid = await choosePermanent(
                    ctx,
                    myPermanents(
                      ctx,
                      source,
                      (definition) =>
                        isDigimon(definition) &&
                        ((definition.forms ?? []).some((form) => form.toLowerCase() === "hybrid") ||
                          hasText(definition, "hybrid")),
                    ),
                  );
                  if (hybrid) {
                    await ctx.fx.modifyDP(hybrid, 3000, EffectDuration.UntilEachTurnEnd);
                    if (await ctx.ask.optional(ctx, "Attack a player with this Digimon?"))
                      await ctx.fx.forceAttack(hybrid, { attackPlayer: true, attackPlayerOnly: true });
                  }
                },
              }),
            ];
          return [];
        }
        case "BT12-100": {
          const resolve = async (ctx: EffectContext) => {
            const target = await choosePermanent(ctx, opposingDigimon(ctx, source));
            if (target) await ctx.fx.deletePermanent([target], "byEffect");
            const shoutmon = myPermanents(ctx, source, (d) => d.nameEn.includes("Shoutmon X7: Superior Mode"))[0];
            if (shoutmon) {
              await ctx.fx.unsuspend([shoutmon.permanentId]);
              await ctx.fx.forceAttack(shoutmon.permanentId, { attackPlayer: true });
            }
          };
          if (timing === EffectTiming.OnUseOption)
            return [
              activated({
                source,
                effectKey: `${cardId}/main`,
                description: "Delete a Digimon, unsuspend Shoutmon X7: Superior Mode and let it attack.",
                resolve,
              }),
            ];
          return [];
        }
        case "BT12-101": {
          const resolve = async (ctx: EffectContext) => {
            const target = await choosePermanent(ctx, opposingDigimon(ctx, source));
            if (target) {
              const p = ctx.game.permanentById(target);
              if (p)
                await ctx.fx.trashDigivolutionCards(
                  target,
                  p.stack.slice(-3).map(({ instanceId }) => instanceId),
                  { byEffectSeat: source.ownerSeat },
                );
            }
            const green =
              myPermanents(ctx, source, (d) => isDigimon(d) && d.colors.includes("Green" as never)).length > 0;
            if (green) {
              const card = await chooseCard(
                ctx,
                ctx.game.player(source.ownerSeat).hand.filter((item) => {
                  const d = ctx.game.definitionOf(item);
                  return (
                    isDigimon(d) &&
                    (d.level ?? Infinity) <= 4 &&
                    d.colors.includes("Blue" as never) &&
                    hasText(d, "free")
                  );
                }),
                true,
              );
              if (card) await ctx.fx.playInstances([card], { payCost: false });
            }
          };
          if (timing === EffectTiming.OnUseOption)
            return [
              activated({
                source,
                effectKey: `${cardId}/main`,
                description: "Trash 3 sources, then optionally play a blue Free Digimon.",
                resolve,
              }),
            ];
          return [];
        }
        case "BT12-102": {
          if (timing === EffectTiming.BeforePayCost)
            return [
              beforePayCost({
                source,
                effectKey: `${cardId}/place-blue-reduce`,
                description:
                  "Place one of your blue Digimon under another blue Digimon to reduce this Option's cost by 3.",
                optional: true,
                resolve: async (ctx) => {
                  const blue = myPermanents(
                    ctx,
                    source,
                    (definition) => isDigimon(definition) && definition.colors.includes("Blue" as never),
                  );
                  if (blue.length < 2) return;
                  const moved = await choosePermanent(ctx, blue, true);
                  if (!moved) return;
                  const destination = await choosePermanent(
                    ctx,
                    blue.filter(({ permanentId }) => permanentId !== moved),
                  );
                  if (!destination) return;
                  if (ctx.fx.relocatePermanent(destination, moved)) {
                    ctx.playCostDelta = (ctx.playCostDelta ?? 0) + 3;
                  }
                },
              }),
            ];
          const resolve = async (ctx: EffectContext) => {
            const target = await choosePermanent(ctx, opposingDigimon(ctx, source));
            const top = target ? ctx.game.permanentById(target)?.topCard : undefined;
            if (top) await ctx.fx.returnToDeck([top.instanceId], { toTop: false });
          };
          if (timing === EffectTiming.OnUseOption)
            return [
              activated({
                source,
                effectKey: `${cardId}/main`,
                description: "Return an opposing Digimon to its owner's deck.",
                resolve,
              }),
            ];
          return [];
        }
        case "BT12-103": {
          if (timing === EffectTiming.None)
            return [
              colorWaiverStatic({
                source,
                effectKey: `${cardId}/hunter-color-waiver`,
                description: "A Hunter Tamer waives this Option's color requirement.",
                when: (ctx) =>
                  myPermanents(ctx, source, (definition) => isTamer(definition) && hasText(definition, "hunter"))
                    .length > 0,
                resolve: async (ctx) => ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.Permanent),
              }),
            ];
          const resolve = async (ctx: EffectContext) => {
            const first = await choosePermanent(ctx, opposingDigimon(ctx, source));
            if (first) await ctx.fx.modifyDP(first, -4000, EffectDuration.UntilEachTurnEnd);
            if (myPermanents(ctx, source, (d, p) => isDigimon(d) && p.stack.length >= 4).length) {
              const second = await choosePermanent(ctx, opposingDigimon(ctx, source));
              if (second) ctx.fx.grantKeyword(second, "SecurityAttack", EffectDuration.UntilEachTurnEnd, -1);
            }
          };
          if (timing === EffectTiming.OnUseOption)
            return [
              activated({
                source,
                effectKey: `${cardId}/main`,
                description: "Give -4000 DP, then possibly Security Attack -1.",
                resolve,
              }),
            ];
          return [];
        }
        case "BT12-104": {
          const resolve = async (ctx: EffectContext) => {
            const marcus = await chooseCard(
              ctx,
              ctx.game
                .player(source.ownerSeat)
                .hand.filter((item) => ctx.game.definitionOf(item).nameEn === "Marcus Damon"),
              true,
            );
            if (marcus) await ctx.fx.playInstances([marcus], { payCost: false });
            const tamers = myPermanents(
              ctx,
              source,
              (d) => isTamer(d) && (d.colors.includes("Yellow" as never) || d.colors.includes("Red" as never)),
            ).length;
            const candidates = opposingDigimon(ctx, source);
            const targets = await ctx.ask.chooseTargets(ctx, {
              candidates: candidates.map(({ permanentId }) => permanentId),
              min: 0,
              max: Math.min(3, candidates.length),
            });
            for (const target of targets) ctx.fx.modifyDP(target, -2000 * tamers, EffectDuration.UntilEachTurnEnd);
          };
          if (timing === EffectTiming.OnUseOption)
            return [
              activated({
                source,
                effectKey: `${cardId}/main`,
                description: "Play Marcus, then reduce up to 3 opposing Digimon per yellow/red Tamer.",
                resolve,
              }),
            ];
          return [];
        }
        case "BT12-105": {
          const resolve = async (ctx: EffectContext) => {
            const target = await choosePermanent(ctx, opposingDigimon(ctx, source));
            const permanent = target ? ctx.game.permanentById(target) : undefined;
            if (permanent?.topCard)
              ctx.fx.grantCustomEffect?.(
                permanent.topCard.instanceId,
                source.ownerSeat,
                "[On Deletion] Trash the top card of your security stack.",
                EffectDuration.UntilOpponentTurnEnd,
              );
            const blue =
              myPermanents(ctx, source, (d) => isDigimon(d) && d.colors.includes("Blue" as never)).length > 0;
            if (blue) {
              const card = await chooseCard(
                ctx,
                ctx.game.player(source.ownerSeat).hand.filter((item) => {
                  const d = ctx.game.definitionOf(item);
                  return (
                    isDigimon(d) &&
                    (d.level ?? Infinity) <= 4 &&
                    d.colors.includes("Green" as never) &&
                    hasText(d, "free")
                  );
                }),
                true,
              );
              if (card) await ctx.fx.playInstances([card], { payCost: false });
            }
          };
          if (timing === EffectTiming.OnUseOption)
            return [
              activated({
                source,
                effectKey: `${cardId}/main`,
                description: "Grant an On Deletion security-trash effect, then possibly play a green Free Digimon.",
                resolve,
              }),
            ];
          return [];
        }
        case "BT12-106": {
          if (timing === EffectTiming.None)
            return [
              colorWaiverStatic({
                source,
                effectKey: `${cardId}/hunter-color-waiver`,
                description: "A Hunter Tamer waives this Option's color requirement.",
                when: (ctx) =>
                  myPermanents(ctx, source, (definition) => isTamer(definition) && hasText(definition, "hunter"))
                    .length > 0,
                resolve: async (ctx) => ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.Permanent),
              }),
            ];
          const resolve = async (ctx: EffectContext) => {
            const ids = ctx.game
              .player(ctx.game.opponentOf(source.ownerSeat))
              .battleArea.filter(
                (p) =>
                  p.topCard &&
                  (isDigimon(ctx.game.definitionOf(p.topCard)) || isTamer(ctx.game.definitionOf(p.topCard))),
              )
              .map(({ permanentId }) => permanentId);
            if (ids.length) await ctx.fx.suspend(ids, { byEffectSeat: source.ownerSeat });
            for (const id of ids) ctx.fx.restrict(id, "unsuspend", EffectDuration.UntilOwnerActivePhase);
          };
          if (timing === EffectTiming.OnUseOption)
            return [
              activated({
                source,
                effectKey: `${cardId}/main`,
                description: "Suspend all opposing Digimon and Tamers and prevent their next unsuspend.",
                resolve,
              }),
            ];
          return [];
        }
        case "BT12-107": {
          if (timing === EffectTiming.OnUseOption)
            return [
              activated({
                source,
                effectKey: `${cardId}/main`,
                description: "Grant an opposing Digimon a forced attack at the start of its main phase.",
                resolve: async (ctx) => {
                  const target = await choosePermanent(ctx, opposingDigimon(ctx, source));
                  const p = target ? ctx.game.permanentById(target) : undefined;
                  if (p?.topCard)
                    ctx.fx.grantCustomEffect?.(
                      p.topCard.instanceId,
                      source.ownerSeat,
                      "[Start of Your Main Phase] Attack with this Digimon.",
                      EffectDuration.UntilOpponentTurnEnd,
                    );
                },
              }),
            ];
          return [];
        }
        case "BT12-108": {
          if (timing === EffectTiming.None)
            return [
              colorWaiverStatic({
                source,
                effectKey: `${cardId}/machine-color-waiver`,
                description: "A level 6 Machine Digimon waives this Option's color requirement.",
                when: (ctx) =>
                  myPermanents(
                    ctx,
                    source,
                    (definition) => isDigimon(definition) && definition.level === 6 && hasText(definition, "machine"),
                  ).length > 0,
                resolve: async (ctx) => ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.Permanent),
              }),
            ];
          if (timing === EffectTiming.OnUseOption)
            return [
              activated({
                source,
                effectKey: `${cardId}/main`,
                description: "Delete your Machine/Cyborg and an opposing Digimon with no more DP.",
                resolve: async (ctx) => {
                  const own = await choosePermanent(
                    ctx,
                    myPermanents(ctx, source, (d) => isDigimon(d) && (hasText(d, "machine") || hasText(d, "cyborg"))),
                  );
                  const ownPermanent = own ? ctx.game.permanentById(own) : undefined;
                  if (!ownPermanent) return;
                  const target = await choosePermanent(
                    ctx,
                    opposingDigimon(ctx, source, (_d, p) => p.currentDP <= ownPermanent.currentDP),
                  );
                  if (target) await ctx.fx.deletePermanent([target], "byEffect");
                  await ctx.fx.deletePermanent([ownPermanent.permanentId], "byEffect");
                },
              }),
            ];
          if (timing === EffectTiming.SecuritySkill)
            return [
              security({
                source,
                effectKey: `${cardId}/security-delete`,
                description: "[Security] Trash a Machine/Cyborg card from hand, then delete an opposing Digimon.",
                resolve: async (ctx) => {
                  const card = await chooseCard(
                    ctx,
                    ctx.game.player(source.ownerSeat).hand.filter((item) => {
                      const definition = ctx.game.definitionOf(item);
                      return hasText(definition, "machine") || hasText(definition, "cyborg");
                    }),
                    true,
                  );
                  if (!card) return;
                  const discarded = ctx.game.definitionOf(
                    ctx.game.player(source.ownerSeat).hand.find((item) => item.instanceId === card)!,
                  );
                  await ctx.fx.trash([card], { byEffectSeat: source.ownerSeat });
                  const target = await choosePermanent(
                    ctx,
                    opposingDigimon(
                      ctx,
                      source,
                      (definition) => (definition.playCost ?? Infinity) <= (discarded.playCost ?? Infinity),
                    ),
                  );
                  if (target) await ctx.fx.deletePermanent([target], "byEffect");
                },
              }),
            ];
          return [];
        }
        case "BT12-109": {
          if (timing === EffectTiming.None)
            return [
              colorWaiverStatic({
                source,
                effectKey: `${cardId}/hunter-color-waiver`,
                description: "A Hunter Tamer waives this Option's color requirement.",
                when: (ctx) =>
                  myPermanents(ctx, source, (definition) => isTamer(definition) && hasText(definition, "hunter"))
                    .length > 0,
                resolve: async (ctx) => ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.Permanent),
              }),
            ];
          if (timing === EffectTiming.OnUseOption)
            return [
              activated({
                source,
                effectKey: `${cardId}/main`,
                description: "Digivolve one of your Digimon into a Save Digimon under a Tamer for its cost.",
                resolve: async (ctx) => {
                  const bases = myPermanents(ctx, source, (d) => isDigimon(d));
                  const base = await choosePermanent(ctx, bases);
                  if (!base) return;
                  const cards: CardInstance[] = [];
                  for (const p of myPermanents(ctx, source, (d) => isTamer(d)))
                    cards.push(
                      ...p.stack.filter(
                        (item) =>
                          isDigimon(ctx.game.definitionOf(item)) && hasText(ctx.game.definitionOf(item), "save"),
                      ),
                    );
                  const card = await chooseCard(ctx, cards);
                  if (card) await ctx.fx.digivolveFromInstance(base, card, { payCost: true });
                },
              }),
            ];
          if (timing === EffectTiming.SecuritySkill) return [_addSelfSecurity(source, cardId)];
          return [];
        }
        case "BT12-110": {
          const resolve = async (ctx: EffectContext) => {
            const target = await choosePermanent(ctx, lowestLevel(ctx, source));
            if (target) await ctx.fx.deletePermanent([target], "byEffect");
          };
          if (timing === EffectTiming.OnUseOption)
            return [
              activated({
                source,
                effectKey: `${cardId}/main`,
                description: "Delete an opposing Digimon with the lowest level.",
                resolve,
              }),
            ];
          if (timing === EffectTiming.SecuritySkill)
            return [
              security({
                source,
                effectKey: `${cardId}/security-activate-main`,
                description: "[Security] Activate this card's [Main] effect.",
                resolve,
              }),
            ];
          if (timing === EffectTiming.None)
            return [
              inTrash({
                source,
                effectKey: `${cardId}/trash-trigger`,
                description:
                  "[Trash][Your Turn] Return this card to the deck when Beelzemon X digivolves to delete the lowest-level Digimon.",
                when: () => source.isOwnersTurn(),
                resolve: async (ctx) => {
                  ctx.fx.subscribeSubTrigger({
                    event: "whenOneOfYoursDigivolves",
                    sourceInstanceId: source.instanceId,
                    once: false,
                    description: `${cardId}: Beelzemon (X Antibody) digivolved`,
                    matches: (subCtx) => {
                      const subjectId = subCtx.trigger.subjectPermanentId;
                      const subject = subjectId === undefined ? undefined : subCtx.game.permanentById(subjectId);
                      return (
                        subject?.controllerSeat === source.ownerSeat &&
                        subject.topCard !== undefined &&
                        subCtx.game.definitionOf(subject.topCard).nameEn === "Beelzemon (X Antibody)"
                      );
                    },
                    run: async (subCtx) => {
                      if (!(await subCtx.ask.optional(subCtx, "Return this card to the deck to activate [Main]?")))
                        return;
                      await subCtx.fx.returnToDeck([source.instanceId], { toTop: false });
                      await resolve(subCtx);
                    },
                  });
                },
              }),
            ];
          return [];
        }
        case "BT12-111": {
          if (timing === EffectTiming.OnPlay || timing === EffectTiming.WhenDigivolving)
            return [
              (timing === EffectTiming.OnPlay ? onPlay : whenDigivolving)({
                source,
                effectKey: `${cardId}/delete-load`,
                description:
                  "Delete an opposing Digimon, then place up to 5 Bagra Army Digimon from trash under this Digimon.",
                resolve: async (ctx) => {
                  const target = await choosePermanent(ctx, opposingDigimon(ctx, source));
                  if (target) await ctx.fx.deletePermanent([target], "byEffect");
                  const self =
                    source.permanent() ??
                    ctx.game.player(source.ownerSeat).battleArea.find(
                      (permanent) => permanent.topCard?.instanceId === source.instanceId,
                    );
                  if (!self) return;
                  const cards = ctx.game
                    .player(source.ownerSeat)
                    .trash.filter(
                      (item) =>
                        isDigimon(ctx.game.definitionOf(item)) && hasText(ctx.game.definitionOf(item), "bagra army"),
                    );
                  const selected = await ctx.ask.selectCards(ctx, {
                    candidates: cards.map(({ instanceId }) => instanceId),
                    min: 0,
                    max: Math.min(5, cards.length),
                    visibleCards: cards.map(({ instanceId, cardId: visibleCardId }) => ({
                      instanceId,
                      cardId: visibleCardId,
                    })),
                  });
                  if (selected.length) await ctx.fx.placeUnder(self.permanentId, selected);
                },
              }),
            ];
          if (timing === EffectTiming.OnUseAttack || timing === EffectTiming.OnEnterFieldAnyone)
            return [
              turnTiming({
                source,
                effectKey: `${cardId}/opponent-action-return-tamers`,
                description: "On an opponent's attack or digivolution, trash 5 sources to return all Tamers to hand.",
                optional: true,
                when: (ctx) => {
                  if (source.isOwnersTurn()) return false;
                  if (timing === EffectTiming.OnUseAttack) {
                    const attacker = ctx.trigger.attackerPermanentId
                      ? ctx.game.permanentById(ctx.trigger.attackerPermanentId)
                      : undefined;
                    return attacker?.controllerSeat === ctx.game.opponentOf(source.ownerSeat);
                  }
                  const subject = ctx.trigger.subjectPermanentId
                    ? ctx.game.permanentById(ctx.trigger.subjectPermanentId)
                    : undefined;
                  return subject?.controllerSeat === ctx.game.opponentOf(source.ownerSeat);
                },
                canActivate: () => (source.permanent()?.stack.length ?? 0) >= 5,
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self || self.stack.length < 5) return;
                  const cost = self.stack.slice(-5).map(({ instanceId }) => instanceId);
                  const moved = await ctx.fx.trashDigivolutionCards(self.permanentId, cost, {
                    byEffectSeat: source.ownerSeat,
                  });
                  if (moved.length !== 5) return;
                  // `players` is an ArraySchema, which throws on flatMap: iterate and collect.
                  const tamers = [];
                  for (const player of ctx.game.state.players) {
                    for (const permanent of player.battleArea) {
                      if (permanent.topCard !== undefined && isTamer(ctx.game.definitionOf(permanent.topCard))) {
                        tamers.push(permanent);
                      }
                    }
                  }
                  const tops = tamers.flatMap((permanent) => (permanent.topCard ? [permanent.topCard.instanceId] : []));
                  if (tops.length) await ctx.fx.returnToHand(tops);
                },
              }),
            ];
          return [];
        }
        case "BT12-112": {
          if (timing === EffectTiming.OnPlay)
            return [
              onPlay({
                source,
                effectKey: `${cardId}/bottom-deck`,
                description: "Return all sources of an opposing Digimon to deck, then bottom-deck that Digimon.",
                resolve: async (ctx) => {
                  const target = await choosePermanent(ctx, opposingDigimon(ctx, source));
                  const p = target ? ctx.game.permanentById(target) : undefined;
                  if (!p?.topCard) return;
                  if (p.stack.length)
                    await ctx.fx.returnToDeck(
                      p.stack.map(({ instanceId }) => instanceId),
                      { toTop: false },
                    );
                  await ctx.fx.returnToDeck([p.topCard.instanceId], { toTop: false });
                },
              }),
            ];
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/disable-option-security`,
                description: "Opponent Option Security effects do not activate on your turn.",
                when: () => source.isOwnersTurn(),
                resolve: async (ctx) =>
                  ctx.fx.disableSecurityEffectsForSeat(
                    ctx.game.opponentOf(source.ownerSeat),
                    "option",
                    EffectDuration.Permanent,
                  ),
              }),
            ];
          return [];
        }
        default:
          return [];
      }
    },
  };
}
