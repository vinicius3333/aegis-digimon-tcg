import {
  CardColor,
  CardKind,
  EffectDuration,
  EffectTiming,
  isDigimon,
  isTamer,
  type CardDefinition,
  type CardInstance,
  type Permanent,
} from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import {
  beforePayCost,
  onDeletion,
  onPlay,
  staticModifier,
  turnTiming,
  whenAttacking,
  whenDigivolving,
} from "../../engine/effects/builders.js";

function text(definition: CardDefinition): string {
  return `${definition.nameEn} ${(definition.types ?? []).join(" ")} ${definition.effectText ?? ""} ${definition.inheritedEffectText ?? ""}`.toLowerCase();
}

function contains(definition: CardDefinition, token: string): boolean {
  return text(definition).includes(token.toLowerCase());
}

function mine(
  ctx: EffectContext,
  source: CardSource,
  match: (definition: CardDefinition, permanent: Permanent) => boolean,
): Permanent[] {
  return ctx.game
    .player(source.ownerSeat)
    .battleArea.filter(
      (candidate) => candidate.topCard !== undefined && match(ctx.game.definitionOf(candidate.topCard), candidate),
    );
}

function sourcePermanent(ctx: EffectContext, source: CardSource): Permanent | undefined {
  return (
    source.permanent() ??
    ctx.game.player(source.ownerSeat).battleArea.find(
      (candidate) => candidate.topCard?.instanceId === source.instanceId,
    )
  );
}

function foes(
  ctx: EffectContext,
  source: CardSource,
  match: (definition: CardDefinition, permanent: Permanent) => boolean = () => true,
): Permanent[] {
  return ctx.game
    .player(ctx.game.opponentOf(source.ownerSeat))
    .battleArea.filter(
      (candidate) =>
        candidate.topCard !== undefined &&
        isDigimon(ctx.game.definitionOf(candidate.topCard)) &&
        match(ctx.game.definitionOf(candidate.topCard), candidate),
    );
}

async function permanent(ctx: EffectContext, candidates: Permanent[], max = 1, optional = false): Promise<string[]> {
  if (!candidates.length) return [];
  return ctx.ask.chooseTargets(ctx, {
    candidates: candidates.map(({ permanentId }) => permanentId),
    min: optional ? 0 : Math.min(1, candidates.length),
    max: Math.min(max, candidates.length),
  });
}

async function card(ctx: EffectContext, candidates: CardInstance[], max = 1, optional = false): Promise<string[]> {
  if (!candidates.length) return [];
  return ctx.ask.selectCards(ctx, {
    candidates: candidates.map(({ instanceId }) => instanceId),
    min: optional ? 0 : Math.min(1, candidates.length),
    max: Math.min(max, candidates.length),
    visibleCards: candidates.map(({ instanceId, cardId }) => ({ instanceId, cardId })),
  });
}

function _stackHas(ctx: EffectContext, source: CardSource, token: string): boolean {
  return source.permanent()?.stack.some((item) => contains(ctx.game.definitionOf(item), token)) ?? false;
}

async function revealSearch(
  ctx: EffectContext,
  source: CardSource,
  count: number,
  predicates: ((definition: CardDefinition) => boolean)[],
): Promise<void> {
  const shown = await ctx.fx.reveal(source.ownerSeat, count);
  const selected: string[] = [];
  for (const predicate of predicates) {
    const eligible = shown.filter(
      (item) => !selected.includes(item.instanceId) && predicate(ctx.game.definitionOf(item)),
    );
    const picked = eligible.length
      ? await ctx.ask.selectCards(ctx, {
          candidates: eligible.map(({ instanceId }) => instanceId),
          min: 1,
          max: 1,
          visible: shown.map(({ instanceId }) => instanceId),
          visibleCards: shown.map(({ instanceId, cardId }) => ({ instanceId, cardId })),
        })
      : [];
    selected.push(...picked);
  }
  if (selected.length) await ctx.fx.returnToHand(selected);
  let rest = shown.map(({ instanceId }) => instanceId).filter((id) => !selected.includes(id));
  if (rest.length > 1 && ctx.ask.orderCards !== undefined) {
    rest = await ctx.ask.orderCards(ctx, {
      candidates: rest,
      visibleCards: shown.map(({ instanceId, cardId }) => ({ instanceId, cardId })),
      destination: "deckBottom",
    });
  }
  if (rest.length) await ctx.fx.returnToDeck(rest, { toTop: false });
}

async function playNamed(
  ctx: EffectContext,
  source: CardSource,
  names: string[],
  zones: ("hand" | "trash")[] = ["hand"],
  max = 1,
): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  const pool = [...(zones.includes("hand") ? owner.hand : []), ...(zones.includes("trash") ? owner.trash : [])];
  const picked = await card(
    ctx,
    pool.filter((item) => names.some((name) => ctx.game.definitionOf(item).nameEn.includes(name))),
    max,
    true,
  );
  if (picked.length) await ctx.fx.playInstances(picked, { payCost: false });
}

async function inheritedMinusDp(ctx: EffectContext, source: CardSource, amount = 2000): Promise<void> {
  const [target] = await permanent(ctx, foes(ctx, source));
  if (target) ctx.fx.modifyDP(target, -amount, EffectDuration.UntilEachTurnEnd);
}

function saveHost(ctx: EffectContext, source: CardSource): boolean {
  const top = sourcePermanent(ctx, source)?.topCard;
  return top !== undefined && contains(ctx.game.definitionOf(top), "save");
}

function saveOnDeletion(cardId: string, source: CardSource): Effect {
  return onDeletion({
    source,
    effectKey: `${cardId}/save`,
    description: "Save this card under one of your Tamers.",
    optional: true,
    resolve: async (ctx) => {
      const [target] = await permanent(
        ctx,
        mine(ctx, source, (definition) => isTamer(definition)),
        1,
        true,
      );
      if (target) await ctx.fx.placeUnder(target, [source.instanceId]);
    },
  });
}

function inheritedSaveMinus(cardId: string, source: CardSource): Effect {
  return whenAttacking({
    source,
    effectKey: `${cardId}/inherited-minus-dp`,
    description: "Save host gives an opposing Digimon -2000 DP when attacking.",
    isInherited: true,
    maxPerTurn: 1,
    canActivate: (ctx) => saveHost(ctx, source),
    resolve: (ctx) => inheritedMinusDp(ctx, source),
  });
}

function inheritedSaveDp(cardId: string, source: CardSource): Effect {
  return staticModifier({
    source,
    effectKey: `${cardId}/inherited-save-dp`,
    description: "Save host gets +2000 DP on your turn.",
    isInherited: true,
    when: (ctx) => source.isOwnersTurn() && saveHost(ctx, source),
    resolve: async (ctx) => {
      const host = sourcePermanent(ctx, source);
      if (host) ctx.fx.modifyDP(host.permanentId, 2000, EffectDuration.Permanent);
    },
  });
}

function opponentDigimonWasDeletedByDpZero(ctx: EffectContext, source: CardSource): boolean {
  const zeroDpTopCards = new Set(ctx.trigger.deletedByDpZeroInstanceIds ?? []);
  if (zeroDpTopCards.size === 0 && ctx.trigger.deletedByDpZero !== true) return false;
  const deleted = new Set(ctx.trigger.deletedInstanceIds ?? []);
  const deletedStack = new Set(ctx.trigger.deletedWasStackInstanceIds ?? []);
  return ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).trash.some(
    (instance) =>
      deleted.has(instance.instanceId) &&
      !deletedStack.has(instance.instanceId) &&
      (zeroDpTopCards.size === 0 || zeroDpTopCards.has(instance.instanceId)) &&
      isDigimon(ctx.game.definitionOf(instance)),
  );
}

function ownTamerWasDeleted(ctx: EffectContext, source: CardSource): boolean {
  const deleted = new Set(ctx.trigger.deletedInstanceIds ?? []);
  return ctx.game.player(source.ownerSeat).trash.some(
    (instance) => deleted.has(instance.instanceId) && isTamer(ctx.game.definitionOf(instance)),
  );
}

function recoverMarcus(cardId: string, source: CardSource, isInherited = false): Effect {
  return turnTiming({
    source,
    effectKey: `${cardId}/${isInherited ? "inherited-" : ""}recover-marcus`,
    description: "When your Tamer is deleted, place Marcus from trash atop security.",
    isInherited,
    maxPerTurn: 1,
    canActivate: (ctx) => ownTamerWasDeleted(ctx, source),
    resolve: async (ctx) => {
      const [marcus] = await card(
        ctx,
        ctx.game
          .player(source.ownerSeat)
          .trash.filter((item) => ctx.game.definitionOf(item).nameEn === "Marcus Damon"),
        1,
        true,
      );
      if (marcus) await ctx.fx.addSecurity(source.ownerSeat, [marcus], { toTop: true, faceUp: false });
    },
  });
}

function endAttackMemory(cardId: string, source: CardSource): Effect {
  return turnTiming({
    source,
    effectKey: `${cardId}/inherited-end-attack`,
    description: "At end of attack, gain memory when the printed condition is met.",
    isInherited: true,
    maxPerTurn: 1,
    canActivate: (ctx) => foes(ctx, source).length === 0,
    resolve: async (ctx) => ctx.fx.gainMemory(cardId === "BT12-016" ? 2 : 1),
  });
}

export function midBt12Module(cardId: string): EffectModule {
  return {
    cardId,
    effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
      switch (cardId) {
        case "BT12-016":
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/delete-or-evolve`,
                description: "Delete 4000 DP or less; if none is deleted, evolve into Gallantmon with cost -1.",
                resolve: async (ctx) => {
                  const targets = foes(ctx, source, (_d, p) => p.currentDP <= 4000);
                  const [target] = await permanent(ctx, targets, 1, true);
                  let deleted = 0;
                  if (target) deleted = await ctx.fx.deletePermanent([target], "byEffect");
                  if (deleted) return;
                  const self = source.permanent();
                  if (!self) return;
                  const [gallantmon] = await card(
                    ctx,
                    ctx.game.player(source.ownerSeat).hand.filter((item) => {
                      const d = ctx.game.definitionOf(item);
                      return isDigimon(d) && d.level === 6 && d.nameEn.includes("Gallantmon");
                    }),
                    1,
                    true,
                  );
                  if (gallantmon)
                    await ctx.fx.digivolveFromInstance(self.permanentId, gallantmon, { payCost: true, costDelta: -1 });
                },
              }),
            ];
          if (timing === EffectTiming.OnEndAttack) return [endAttackMemory(cardId, source)];
          return [];
        case "BT12-017":
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/security-attack`,
                description: "Security Attack +1",
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (self) ctx.fx.grantKeyword(self.permanentId, "SecurityAttack", EffectDuration.Permanent, 1);
                },
              }),
            ];
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/delete`,
                description: "Delete an opposing Digimon within the applicable DP cap.",
                resolve: async (ctx) => {
                  const self = source.permanent();
                  // The printed condition is specifically a red Tamer in the
                  // digivolution cards.  Checking the stack for the words
                  // "tamer" and "red" independently incorrectly upgraded a
                  // stack containing (for example) a red Digimon plus a blue
                  // Tamer.  Keep the colour and kind test on the same source
                  // card.
                  const hasRedTamer = self?.stack.some((item) => {
                    const definition = ctx.game.definitionOf(item);
                    return isTamer(definition) && definition.colors.includes(CardColor.Red);
                  }) === true;
                  const cap = hasRedTamer ? (self?.currentDP ?? 6000) : 6000;
                  const [target] = await permanent(
                    ctx,
                    foes(ctx, source, (_d, p) => p.currentDP <= cap),
                  );
                  if (target) await ctx.fx.deletePermanent([target], "byEffect");
                },
              }),
            ];
          if (timing === EffectTiming.OnDestroyedAnyone)
            return [
              onDeletion({
                source,
                effectKey: `${cardId}/play-takuya`,
                description: "Play Takuya Kanbara from hand or trash.",
                optional: true,
                resolve: (ctx) => playNamed(ctx, source, ["Takuya Kanbara"], ["hand", "trash"]),
              }),
            ];
          return [];
        case "BT12-018":
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/raid`,
                description: "Raid",
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (self) ctx.fx.grantKeyword(self.permanentId, "Raid", EffectDuration.Permanent);
                },
              }),
            ];
          if (timing === EffectTiming.WhenDigivolving || timing === EffectTiming.OnUseAttack)
            return [
              (timing === EffectTiming.WhenDigivolving ? whenDigivolving : whenAttacking)({
                source,
                effectKey: `${cardId}/${timing}`,
                description: "Delete a 6000 DP or lower Digimon; when attacking, trash security if none was deleted.",
                resolve: async (ctx) => {
                  const [target] = await permanent(
                    ctx,
                    foes(ctx, source, (_d, p) => p.currentDP <= 6000),
                    1,
                    true,
                  );
                  const deleted = target ? await ctx.fx.deletePermanent([target], "byEffect") : 0;
                  if (!deleted && timing === EffectTiming.OnUseAttack)
                    await ctx.fx.trashFromSecurity(ctx.game.opponentOf(source.ownerSeat), 1, { fromTop: true });
                },
              }),
            ];
          return [];
        case "BT12-019":
        case "BT12-023":
          if (timing === EffectTiming.OnUseAttack)
            return [
              turnTiming({
                source,
                effectKey: `${cardId}/inherited-trash-bottom`,
                description: "On an opponent attack, trash an opponent Digimon's bottom source.",
                isInherited: true,
                maxPerTurn: 1,
                when: (ctx) => {
                  const attacker = ctx.trigger.attackerPermanentId
                    ? ctx.game.permanentById(ctx.trigger.attackerPermanentId)
                    : undefined;
                  return !source.isOwnersTurn() && attacker?.controllerSeat === ctx.game.opponentOf(source.ownerSeat);
                },
                resolve: async (ctx) => {
                  const [target] = await permanent(
                    ctx,
                    foes(ctx, source, (_d, p) => p.stack.length > 0),
                  );
                  const p = target ? ctx.game.permanentById(target) : undefined;
                  const bottom = p?.stack[0];
                  if (p && bottom)
                    await ctx.fx.trashDigivolutionCards(p.permanentId, [bottom.instanceId], {
                      byEffectSeat: source.ownerSeat,
                    });
                },
              }),
            ];
          return [];
        case "BT12-020":
        case "BT12-033":
        case "BT12-046":
        case "BT12-052":
          return [];
        case "BT12-021":
        case "BT12-047":
          if (timing === EffectTiming.OnPlay)
            return [
              onPlay({
                source,
                effectKey: `${cardId}/search`,
                description: "Reveal 3 and add a Free/Imperialdramon card plus the named Tamer.",
                resolve: (ctx) =>
                  revealSearch(ctx, source, 3, [
                    (d) => isDigimon(d) && (d.nameEn.includes("Imperialdramon") || cardHasTrait(d, "Free")),
                    (d) => isTamer(d) && d.nameEn.includes(cardId === "BT12-021" ? "Davis Motomiya" : "Ken Ichijoji"),
                  ]),
              }),
            ];
          if (timing === EffectTiming.OnEndTurn)
            return [
              turnTiming({
                source,
                effectKey: `${cardId}/inherited-dna`,
                description: "At end of turn, DNA digivolve this and another Digimon.",
                isInherited: true,
                optional: true,
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  const others = mine(
                    ctx,
                    source,
                    (definition, candidate) => isDigimon(definition) && candidate.permanentId !== self.permanentId,
                  );
                  const [other] = await permanent(ctx, others, 1, true);
                  if (!other) return;
                  const [result] = await card(
                    ctx,
                    ctx.game.player(source.ownerSeat).hand.filter((item) => isDigimon(ctx.game.definitionOf(item))),
                    1,
                    true,
                  );
                  if (result) await ctx.fx.dnaDigivolveInto([self.permanentId, other], result, { payCost: true });
                },
              }),
            ];
          return [];
        case "BT12-022":
        case "BT12-050":
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/dna-memory`,
                description: "Gain 1 memory when this Digimon DNA digivolves into the paired color.",
                when: () => source.isOwnersTurn(),
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  ctx.fx.subscribeReplacement({
                    event: "wouldDigivolve",
                    sourcePermanentId: self.permanentId,
                    mode: "gainMemoryOnDna",
                    amount: 1,
                    description: `${cardId}: DNA memory gain`,
                    intoMatches: (definition) =>
                      definition.colors.includes(cardId === "BT12-022" ? CardColor.Green : CardColor.Blue),
                  });
                },
              }),
              staticModifier({
                source,
                effectKey: `${cardId}/inherited-keyword`,
                description: "Imperialdramon/Free host gains its inherited keyword.",
                isInherited: true,
                when: (ctx) => {
                  const top = source.permanent()?.topCard;
                  return (
                    source.isOwnersTurn() &&
                    top !== undefined &&
                    (ctx.game.definitionOf(top).nameEn.includes("Imperialdramon") ||
                      cardHasTrait(ctx.game.definitionOf(top), "Free"))
                  );
                },
                resolve: async (ctx) => {
                  const host = source.permanent();
                  if (!host) return;
                  if (cardId === "BT12-022") {
                    ctx.fx.grantKeyword(host.permanentId, "Jamming", EffectDuration.Permanent);
                  } else {
                    ctx.fx.grantPierce(host.permanentId, EffectDuration.Permanent);
                  }
                },
              }),
            ];
          return [];
        case "BT12-024":
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/place-jamming`,
                description: "Place a blue level 3 from hand under a blue Digimon to gain Jamming.",
                optional: true,
                resolve: async (ctx) => {
                  const [item] = await card(
                    ctx,
                    ctx.game.player(source.ownerSeat).hand.filter((c) => {
                      const d = ctx.game.definitionOf(c);
                      return isDigimon(d) && d.level === 3 && d.colors.includes(CardColor.Blue);
                    }),
                    1,
                    true,
                  );
                  const [target] = await permanent(
                    ctx,
                    mine(ctx, source, (d) => isDigimon(d) && d.colors.includes(CardColor.Blue)),
                  );
                  if (item && target && (await ctx.fx.placeUnder(target, [item])).length) {
                    const self = source.permanent();
                    if (self) ctx.fx.grantKeyword(self.permanentId, "Jamming", EffectDuration.UntilEachTurnEnd);
                  }
                },
              }),
            ];
          return [];
        case "BT12-025":
          if (timing === EffectTiming.OnUseAttack)
            return [
              whenAttacking({
                source,
                effectKey: `${cardId}/play-level3`,
                description: "Play a blue level 3 from a blue Digimon's sources.",
                optional: true,
                resolve: async (ctx) => {
                  const pool: CardInstance[] = [];
                  for (const p of mine(ctx, source, (d) => isDigimon(d) && d.colors.includes(CardColor.Blue)))
                    pool.push(...p.stack.filter((item) => ctx.game.definitionOf(item).level === 3));
                  const picked = await card(ctx, pool, 1, true);
                  if (picked.length) await ctx.fx.playInstances(picked, { payCost: false });
                },
              }),
            ];
          return [];
        case "BT12-026":
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/place-trash`,
                description: "Place a blue level 5 or lower card to trash two bottom sources from two Digimon.",
                optional: true,
                resolve: async (ctx) => {
                  const [cost] = await card(
                    ctx,
                    ctx.game.player(source.ownerSeat).hand.filter((item) => {
                      const d = ctx.game.definitionOf(item);
                      return isDigimon(d) && (d.level ?? 99) <= 5 && d.colors.includes(CardColor.Blue);
                    }),
                    1,
                    true,
                  );
                  const self = source.permanent();
                  if (!cost || !self || !(await ctx.fx.placeUnder(self.permanentId, [cost])).length) return;
                  const targets = await permanent(
                    ctx,
                    foes(ctx, source, (_d, p) => p.stack.length > 0),
                    2,
                  );
                  for (const id of targets) {
                    const p = ctx.game.permanentById(id);
                    const bottom = p?.stack.slice(0, 2).map(({ instanceId }) => instanceId) ?? [];
                    if (bottom.length)
                      await ctx.fx.trashDigivolutionCards(id, bottom, { byEffectSeat: source.ownerSeat });
                  }
                },
              }),
            ];
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/watch-trash`,
                description: "Gain 1 memory once when an opponent source is trashed.",
                maxPerTurn: 1,
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  ctx.fx.subscribeSubTrigger({
                    event: "onDigivolutionCardDiscarded",
                    sourcePermanentId: self.permanentId,
                    once: false,
                    oncePerTurnKey: `${cardId}/watch-trash`,
                    description: `${cardId}: opponent source trashed`,
                    matches: (sub) => sub.trigger.byEffectSeat === source.ownerSeat,
                    run: async (sub) => sub.fx.gainMemory(1),
                  });
                },
              }),
            ];
          return [];
        case "BT12-027":
          if (timing === EffectTiming.OnPlay || timing === EffectTiming.WhenDigivolving)
            return [
              (timing === EffectTiming.OnPlay ? onPlay : whenDigivolving)({
                source,
                effectKey: `${cardId}/place-memory`,
                description: "Place another blue Digimon under this Digimon to gain 2 memory.",
                optional: true,
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  const [other] = await permanent(
                    ctx,
                    mine(
                      ctx,
                      source,
                      (d, p) => isDigimon(d) && d.colors.includes(CardColor.Blue) && p.permanentId !== self.permanentId,
                    ),
                    1,
                    true,
                  );
                  if (other && ctx.fx.relocatePermanent(self.permanentId, other)) ctx.fx.gainMemory(2);
                },
              }),
            ];
          return [];
        case "BT12-028":
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/trash-sources`,
                description:
                  "Trash the top 3 sources of all opposing Digimon and restrict source-less attackers after DNA.",
                resolve: async (ctx) => {
                  for (const target of foes(ctx, source)) {
                    const ids = target.stack.slice(-3).map(({ instanceId }) => instanceId);
                    if (ids.length)
                      await ctx.fx.trashDigivolutionCards(target.permanentId, ids, { byEffectSeat: source.ownerSeat });
                  }
                  if (ctx.trigger.isDnaDigivolve) {
                    for (const target of foes(ctx, source, (_d, p) => p.stack.length === 0).slice(0, 2))
                      ctx.fx.restrict(target.permanentId, "attack", EffectDuration.UntilOpponentTurnEnd);
                  }
                },
              }),
            ];
          if (timing === EffectTiming.OnEndAttack) return [endAttackMemory(cardId, source)];
          return [];
        case "BT12-029":
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/unsuspend`,
                description: "Unsuspend this Digimon or a blue Tamer.",
                resolve: async (ctx) => {
                  const candidates = [
                    source.permanent(),
                    ...mine(ctx, source, (d) => isTamer(d) && d.colors.includes(CardColor.Blue)),
                  ].filter((p): p is Permanent => p !== undefined);
                  const [target] = await permanent(ctx, candidates);
                  if (target) await ctx.fx.unsuspend([target]);
                },
              }),
            ];
          if (timing === EffectTiming.OnUnTappedAnyone)
            return [
              turnTiming({
                source,
                effectKey: `${cardId}/bounce-lowest`,
                description: "When this Digimon unsuspends, bounce an opposing lowest-level Digimon.",
                maxPerTurn: 1,
                when: (ctx) => ctx.trigger.unsuspendedPermanentId === source.permanent()?.permanentId,
                resolve: async (ctx) => {
                  const candidates = foes(ctx, source, (d) => d.level !== undefined);
                  const min = Math.min(...candidates.map((p) => ctx.game.definitionOf(p.topCard!).level ?? Infinity));
                  const [target] = await permanent(
                    ctx,
                    candidates.filter((p) => ctx.game.definitionOf(p.topCard!).level === min),
                  );
                  const top = target ? ctx.game.permanentById(target)?.topCard : undefined;
                  if (top) await ctx.fx.returnToHand([top.instanceId]);
                },
              }),
            ];
          return [];
        case "BT12-030":
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/colors`,
                description: "Blue source unsuspends; green source suspends an opponent.",
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  if (self.stack.some((item) => ctx.game.definitionOf(item).colors.includes(CardColor.Blue)))
                    await ctx.fx.unsuspend([self.permanentId]);
                  if (self.stack.some((item) => ctx.game.definitionOf(item).colors.includes(CardColor.Green))) {
                    const [target] = await permanent(ctx, foes(ctx, source));
                    if (target) await ctx.fx.suspend([target], { byEffectSeat: source.ownerSeat });
                  }
                },
              }),
            ];
          if (timing === EffectTiming.OnEndAttack)
            return [
              turnTiming({
                source,
                effectKey: `${cardId}/end-attack-evolve`,
                description: "At end of attack, evolve into Imperialdramon with cost -2.",
                optional: true,
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  const [result] = await card(
                    ctx,
                    ctx.game
                      .player(source.ownerSeat)
                      .hand.filter(
                        (item) =>
                          isDigimon(ctx.game.definitionOf(item)) &&
                          ctx.game.definitionOf(item).nameEn.includes("Imperialdramon"),
                      ),
                    1,
                    true,
                  );
                  if (result)
                    await ctx.fx.digivolveFromInstance(self.permanentId, result, { payCost: true, costDelta: -2 });
                },
              }),
            ];
          return [];
        case "BT12-031":
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/suspend-return`,
                description:
                  "Suspend source-less opponents, then bounce one or bottom-deck all by returning Dragon Mode from sources.",
                resolve: async (ctx) => {
                  const sourceLess = foes(ctx, source, (_d, p) => p.stack.length === 0);
                  await ctx.fx.suspend(
                    sourceLess.map(({ permanentId }) => permanentId),
                    { byEffectSeat: source.ownerSeat },
                  );
                  const self = source.permanent();
                  const dragon = self?.stack.find((item) =>
                    ctx.game.definitionOf(item).nameEn.includes("Imperialdramon: Dragon Mode"),
                  );
                  if (
                    self &&
                    dragon &&
                    (await ctx.ask.optional(ctx, "Return Dragon Mode to bottom-deck all suspended Digimon?"))
                  ) {
                    await ctx.fx.returnToHand([dragon.instanceId]);
                    for (const target of foes(ctx, source, (_d, p) => p.isSuspended))
                      if (target.topCard) await ctx.fx.returnToDeck([target.topCard.instanceId], { toTop: false });
                    return;
                  }
                  const [target] = await permanent(
                    ctx,
                    foes(ctx, source, (_d, p) => p.isSuspended),
                  );
                  const top = target ? ctx.game.permanentById(target)?.topCard : undefined;
                  if (top) await ctx.fx.returnToHand([top.instanceId]);
                },
              }),
            ];
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/color-bonuses`,
                description: "+1000 DP per source color; at 2+ colors gain Security Attack +1 and Blocker.",
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  const colors = new Set<CardColor>();
                  for (const item of self.stack) {
                    for (const color of ctx.game.definitionOf(item).colors) colors.add(color);
                  }
                  if (colors.size) ctx.fx.modifyDP(self.permanentId, colors.size * 1000, EffectDuration.Permanent);
                  if (colors.size >= 2) {
                    ctx.fx.grantKeyword(self.permanentId, "SecurityAttack", EffectDuration.Permanent, 1);
                    ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.Permanent);
                  }
                },
              }),
            ];
          return [];
        case "BT12-032":
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/play-source`,
                description: "Play a blue Hybrid/Aqua/Sea Animal from a blue Digimon's sources.",
                optional: true,
                resolve: async (ctx) => {
                  const pool: CardInstance[] = [];
                  for (const p of mine(ctx, source, (d) => isDigimon(d) && d.colors.includes(CardColor.Blue)))
                    pool.push(
                      ...p.stack.filter((item) =>
                        ["hybrid", "aqua", "sea animal"].some((token) => contains(ctx.game.definitionOf(item), token)),
                      ),
                    );
                  const picked = await card(ctx, pool, 1, true);
                  if (picked.length) await ctx.fx.playInstances(picked, { payCost: false });
                },
              }),
            ];
          if (timing === EffectTiming.OnDestroyedAnyone)
            return [
              onDeletion({
                source,
                effectKey: `${cardId}/play-hybrid`,
                description: "Play a blue level 4 or lower Hybrid from hand.",
                optional: true,
                resolve: async (ctx) => {
                  const picked = await card(
                    ctx,
                    ctx.game.player(source.ownerSeat).hand.filter((item) => {
                      const d = ctx.game.definitionOf(item);
                      return (
                        isDigimon(d) &&
                        (d.level ?? 99) <= 4 &&
                        d.colors.includes(CardColor.Blue) &&
                        contains(d, "hybrid")
                      );
                    }),
                    1,
                    true,
                  );
                  if (picked.length) await ctx.fx.playInstances(picked, { payCost: false });
                },
              }),
            ];
          return [];
        case "BT12-034":
          if (timing === EffectTiming.OnPlay)
            return [
              onPlay({
                source,
                effectKey: `${cardId}/search`,
                description: "Reveal 4 and add Greymon plus Marcus Damon.",
                resolve: (ctx) =>
                  revealSearch(ctx, source, 4, [
                    (d) => isDigimon(d) && d.nameEn.includes("Greymon"),
                    (d) => isTamer(d) && d.nameEn === "Marcus Damon",
                  ]),
              }),
            ];
          if (timing === EffectTiming.OnTappedAnyone)
            return [
              turnTiming({
                source,
                effectKey: `${cardId}/inherited-tamer-suspend`,
                description: "When a yellow/red Tamer suspends, give an opponent -2000 DP.",
                isInherited: true,
                maxPerTurn: 1,
                when: (ctx) => {
                  const suspended = ctx.trigger.suspendedPermanentId
                    ? ctx.game.permanentById(ctx.trigger.suspendedPermanentId)
                    : undefined;
                  if (suspended?.controllerSeat !== source.ownerSeat || suspended.topCard === undefined) return false;
                  const definition = ctx.game.definitionOf(suspended.topCard);
                  return (
                    isTamer(definition) &&
                    (definition.colors.includes(CardColor.Yellow) || definition.colors.includes(CardColor.Red))
                  );
                },
                resolve: (ctx) => inheritedMinusDp(ctx, source),
              }),
            ];
          return [];
        case "BT12-035":
          if (timing === EffectTiming.OnUseAttack) return [inheritedSaveMinus(cardId, source)];
          return [];
        case "BT12-036":
        case "BT12-053":
          if (timing === EffectTiming.OnBattleDeleteOpponent)
            return [
              turnTiming({
                source,
                effectKey: `${cardId}/inherited-battle-memory`,
                description: "Gain 1 memory after deleting an opponent in battle.",
                isInherited: true,
                maxPerTurn: 1,
                resolve: async (ctx) => ctx.fx.gainMemory(1),
              }),
            ];
          return [];
        case "BT12-037":
        case "BT12-051":
          if (timing === EffectTiming.OnPlay || timing === EffectTiming.WhenDigivolving)
            return [
              (timing === EffectTiming.OnPlay ? onPlay : whenDigivolving)({
                source,
                effectKey: `${cardId}/play-hunter`,
                description: "Play Airu, Ren, or Ryoma for free.",
                optional: true,
                resolve: async (ctx) => {
                  if (cardId === "BT12-037") {
                    const shown = await ctx.fx.reveal(source.ownerSeat, 3);
                    const picked = await card(
                      ctx,
                      shown.filter((item) =>
                        ["Airu Suzaki", "Ren Tobari", "Ryoma Mogami"].includes(ctx.game.definitionOf(item).nameEn),
                      ),
                      1,
                      true,
                    );
                    if (picked.length) await ctx.fx.playInstances(picked, { payCost: false });
                    const rest = shown.map(({ instanceId }) => instanceId).filter((id) => !picked.includes(id));
                    if (rest.length) await ctx.fx.returnToDeck(rest, { toTop: false });
                  } else await playNamed(ctx, source, ["Airu Suzaki", "Ren Tobari", "Ryoma Mogami"]);
                },
              }),
            ];
          if (timing === EffectTiming.OnDestroyedAnyone)
            return [
              saveOnDeletion(cardId, source),
              onDeletion({
                source,
                effectKey: `${cardId}/place-save-from-trash`,
                description: "Place a Save Digimon from trash under one of your Tamers.",
                resolve: async (ctx) => {
                  const [saved] = await card(
                    ctx,
                    ctx.game
                      .player(source.ownerSeat)
                      .trash.filter(
                        (item) =>
                          isDigimon(ctx.game.definitionOf(item)) && contains(ctx.game.definitionOf(item), "save"),
                      ),
                    1,
                  );
                  const [tamer] = await permanent(
                    ctx,
                    mine(ctx, source, (definition) => isTamer(definition)),
                    1,
                  );
                  if (saved && tamer) await ctx.fx.placeUnder(tamer, [saved]);
                },
              }),
            ];
          if (timing === EffectTiming.OnUseAttack) return [inheritedSaveMinus(cardId, source)];
          if (timing === EffectTiming.None && cardId === "BT12-051") return [inheritedSaveDp(cardId, source)];
          return [];
        case "BT12-038":
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/play-marcus`,
                description: "Play Marcus Damon if none is in play.",
                optional: true,
                when: (ctx) => mine(ctx, source, (d) => isTamer(d) && d.nameEn === "Marcus Damon").length === 0,
                resolve: (ctx) => playNamed(ctx, source, ["Marcus Damon"]),
              }),
            ];
          if (timing === EffectTiming.OnTappedAnyone)
            return [
              turnTiming({
                source,
                effectKey: `${cardId}/inherited-tamer-suspend`,
                description: "When a yellow/red Tamer suspends, give an opponent -2000 DP.",
                isInherited: true,
                maxPerTurn: 1,
                when: (ctx) => {
                  const suspended = ctx.trigger.suspendedPermanentId
                    ? ctx.game.permanentById(ctx.trigger.suspendedPermanentId)
                    : undefined;
                  if (suspended?.controllerSeat !== source.ownerSeat || suspended.topCard === undefined) return false;
                  const definition = ctx.game.definitionOf(suspended.topCard);
                  return (
                    isTamer(definition) &&
                    (definition.colors.includes(CardColor.Yellow) || definition.colors.includes(CardColor.Red))
                  );
                },
                resolve: (ctx) => inheritedMinusDp(ctx, source),
              }),
            ];
          return [];
        case "BT12-039":
        case "BT12-040":
          if (timing === EffectTiming.BeforePayCost)
            return [
              beforePayCost({
                source,
                effectKey: `${cardId}/play-reducer`,
                description: "Reduce play cost by 3 if opponent has a Security Attack Digimon.",
                when: (ctx) =>
                  foes(
                    ctx,
                    source,
                    (d, p) =>
                      contains(d, "security attack") || ctx.game.hasKeyword?.(p.permanentId, "SecurityAttack") === true,
                  ).length > 0,
                resolve: async (ctx) => {
                  ctx.playCostDelta = (ctx.playCostDelta ?? 0) + 3;
                },
              }),
            ];
          if (timing === EffectTiming.OnUseAttack)
            return [
              whenAttacking({
                source,
                effectKey: `${cardId}/inherited-sa-minus`,
                description: "Give an opposing Digimon Security Attack -1 through its turn.",
                isInherited: true,
                maxPerTurn: 1,
                resolve: async (ctx) => {
                  const [target] = await permanent(ctx, foes(ctx, source));
                  if (target) ctx.fx.grantKeyword(target, "SecurityAttack", EffectDuration.UntilOpponentTurnEnd, -1);
                },
              }),
            ];
          return [];
        case "BT12-041":
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/scaled-minus`,
                description: "For every 2 sources, give an opposing Digimon -3000 DP.",
                resolve: async (ctx) => {
                const digivolutionCardCount = Math.max(0, (sourcePermanent(ctx, source)?.stack.length ?? 1) - 1);
                  const times = Math.floor(digivolutionCardCount / 2);
                  for (let i = 0; i < times; i += 1) await inheritedMinusDp(ctx, source, 3000);
                },
              }),
            ];
          if (timing === EffectTiming.OnDestroyedAnyone)
            return [
              turnTiming({
                source,
                effectKey: `${cardId}/draw-zero-dp`,
                description: "Draw when an opponent is deleted by reaching 0 DP.",
                when: (ctx) => source.isOwnersTurn() && opponentDigimonWasDeletedByDpZero(ctx, source),
                resolve: async (ctx) => {
                  await ctx.fx.draw(source.ownerSeat, 1);
                },
              }),
            ];
          if (timing === EffectTiming.OnUseAttack) return [inheritedSaveMinus(cardId, source)];
          return [];
        case "BT12-042":
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/memory`,
                description: "Gain 1 memory with a yellow or red Tamer.",
                when: (ctx) =>
                  mine(
                    ctx,
                    source,
                    (d) => isTamer(d) && (d.colors.includes(CardColor.Yellow) || d.colors.includes(CardColor.Red)),
                  ).length > 0,
                resolve: async (ctx) => ctx.fx.gainMemory(1),
              }),
            ];
          if (timing === EffectTiming.OnDestroyedAnyone)
            return [recoverMarcus(cardId, source), recoverMarcus(cardId, source, true)];
          return [];
        case "BT12-043":
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/tamer-scaled-dp`,
                description:
                  "For each yellow/red Tamer, give one opposing Digimon and all opposing Security Digimon -3000 DP.",
                resolve: async (ctx) => {
                  const count = mine(
                    ctx,
                    source,
                    (d) => isTamer(d) && (d.colors.includes(CardColor.Yellow) || d.colors.includes(CardColor.Red)),
                  ).length;
                  const [target] = count ? await permanent(ctx, foes(ctx, source)) : [];
                  if (target) ctx.fx.modifyDP(target, -3000 * count, EffectDuration.UntilEachTurnEnd);
                  if (count)
                    ctx.fx.modifySecurityDp(ctx.game.opponentOf(source.ownerSeat), -3000 * count, {
                      continuous: false,
                      duration: EffectDuration.UntilEachTurnEnd,
                    });
                },
              }),
            ];
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/marcus-buff`,
                description: "Your Marcus Damon cards get +3000 DP and Security Attack +1.",
                when: () => source.isOwnersTurn(),
                resolve: async (ctx) => {
                  for (const p of mine(ctx, source, (d) => d.nameEn === "Marcus Damon")) {
                    const definition = ctx.game.definitionOf(p.topCard!);
                    const kinds = ctx.game.effectiveKinds?.(p.permanentId) ?? definition.kinds;
                    if (kinds.includes(CardKind.Digimon))
                      ctx.fx.modifyDP(p.permanentId, 3000, EffectDuration.Permanent);
                    ctx.fx.grantKeyword(p.permanentId, "SecurityAttack", EffectDuration.Permanent, 1);
                  }
                },
              }),
            ];
          return [];
        case "BT12-044":
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/minus-two`,
                description: "Give an opposing Digimon Security Attack -2 through its turn.",
                resolve: async (ctx) => {
                  const [target] = await permanent(ctx, foes(ctx, source));
                  if (target) ctx.fx.grantKeyword(target, "SecurityAttack", EffectDuration.UntilOpponentTurnEnd, -2);
                },
              }),
            ];
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/scaled-sa`,
                description: "Security Attack +1 per opposing Digimon with Security Attack.",
                when: () => source.isOwnersTurn(),
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  const count = foes(
                    ctx,
                    source,
                    (d, p) =>
                      contains(d, "security attack") || ctx.game.hasKeyword?.(p.permanentId, "SecurityAttack") === true,
                  ).length;
                  if (count) ctx.fx.grantKeyword(self.permanentId, "SecurityAttack", EffectDuration.Permanent, count);
                },
              }),
            ];
          return [];
        case "BT12-045":
          if (timing === EffectTiming.OnPlay)
            return [
              onPlay({
                source,
                effectKey: `${cardId}/reveal-one`,
                description: "Reveal one; add it if green Digimon, otherwise bottom-deck it.",
                resolve: async (ctx) => {
                  const shown = await ctx.fx.reveal(source.ownerSeat, 1);
                  const item = shown[0];
                  if (!item) return;
                  const d = ctx.game.definitionOf(item);
                  if (isDigimon(d) && d.colors.includes(CardColor.Green)) await ctx.fx.returnToHand([item.instanceId]);
                  else await ctx.fx.returnToDeck([item.instanceId], { toTop: false });
                },
              }),
            ];
          return [];
        case "BT12-048":
          if (timing === EffectTiming.OnPlay)
            return [
              onPlay({
                source,
                effectKey: `${cardId}/cycle-tamers`,
                description: "Bottom-deck up to 3 Tamers from hand, drawing one per card.",
                optional: true,
                resolve: async (ctx) => {
                  const picked = await card(
                    ctx,
                    ctx.game.player(source.ownerSeat).hand.filter((item) => isTamer(ctx.game.definitionOf(item))),
                    3,
                    true,
                  );
                  if (!picked.length) return;
                  await ctx.fx.returnToDeck(picked, { toTop: false });
                  await ctx.fx.draw(source.ownerSeat, picked.length);
                },
              }),
            ];
          if (timing === EffectTiming.OnDestroyedAnyone) return [saveOnDeletion(cardId, source)];
          if (timing === EffectTiming.None) return [inheritedSaveDp(cardId, source)];
          return [];
        case "BT12-049":
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
            ];
          return [];
        case "BT12-054":
          if (timing === EffectTiming.OnDestroyedAnyone)
            return [
              onDeletion({
                source,
                effectKey: `${cardId}/play-two`,
                description: "Play up to two Yakiimon/Potamon from hand.",
                optional: true,
                resolve: (ctx) => playNamed(ctx, source, ["Yakiimon", "Potamon"], ["hand"], 2),
              }),
            ];
          return [];
        case "BT12-055":
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/dna-attack`,
                description: "When DNA digivolving, suspend an opponent, gain +3000 DP, then may attack it.",
                resolve: async (ctx) => {
                  const [target] = await permanent(ctx, foes(ctx, source));
                  const self = source.permanent();
                  if (self) {
                    if (ctx.trigger.isDnaDigivolve === true) {
                      if (target) await ctx.fx.suspend([target], { byEffectSeat: source.ownerSeat });
                      ctx.fx.modifyDP(self.permanentId, 3000, EffectDuration.UntilEachTurnEnd);
                    }
                    if (target && (await ctx.ask.optional(ctx, "Attack the targeted opponent's Digimon?")))
                      await ctx.fx.forceAttack(self.permanentId);
                  }
                },
              }),
            ];
          if (timing === EffectTiming.OnBattleDeleteOpponent)
            return [
              turnTiming({
                source,
                effectKey: `${cardId}/inherited-security-trash`,
                description: "After qualifying ally deletes in battle, trash opposing security.",
                isInherited: true,
                maxPerTurn: 1,
                when: (ctx) => {
                  const host = source.permanent()?.topCard;
                  if (host === undefined || !source.isOwnersTurn()) return false;
                  const definition = ctx.game.definitionOf(host);
                  return isDigimon(definition) &&
                    (definition.nameEn.includes("Imperialdramon") || cardHasTrait(definition, "Free"));
                },
                resolve: async (ctx) => {
                  await ctx.fx.trashFromSecurity(ctx.game.opponentOf(source.ownerSeat), 1, { fromTop: true });
                },
              }),
            ];
          return [];
        case "BT12-056":
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/suspend-attack`,
                description: "Suspend an opposing Digimon, then may attack it.",
                resolve: async (ctx) => {
                  const [target] = await permanent(ctx, foes(ctx, source));
                  if (target) await ctx.fx.suspend([target], { byEffectSeat: source.ownerSeat });
                  const self = source.permanent();
                  if (self && target && (await ctx.ask.optional(ctx, "Attack the targeted opponent's Digimon?")))
                    await ctx.fx.forceAttack(self.permanentId);
                },
              }),
            ];
          if (timing === EffectTiming.OnTappedAnyone)
            return [
              turnTiming({
                source,
                effectKey: `${cardId}/memory`,
                description: "Gain 1 memory once when an opponent Digimon becomes suspended.",
                maxPerTurn: 1,
                when: (ctx) => {
                  const p = ctx.trigger.suspendedPermanentId
                    ? ctx.game.permanentById(ctx.trigger.suspendedPermanentId)
                    : undefined;
                  return (
                    source.isOwnersTurn() &&
                    p?.controllerSeat === ctx.game.opponentOf(source.ownerSeat) &&
                    p.topCard !== undefined &&
                    isDigimon(ctx.game.definitionOf(p.topCard))
                  );
                },
                resolve: async (ctx) => ctx.fx.gainMemory(1),
              }),
            ];
          return [];
        default:
          return [];
      }
    },
  };
}
