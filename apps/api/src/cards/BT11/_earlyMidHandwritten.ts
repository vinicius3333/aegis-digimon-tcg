import {
  CardColor,
  EffectDuration,
  EffectTiming,
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
  onDeletion,
  onPlay,
  staticModifier,
  turnTiming,
  whenAttacking,
  whenDigivolving,
} from "../../engine/effects/builders.js";

function text(d: CardDefinition): string {
  return `${d.nameEn} ${(d.types ?? []).join(" ")} ${d.effectText ?? ""} ${d.inheritedEffectText ?? ""}`.toLowerCase();
}
function has(d: CardDefinition, token: string): boolean {
  return text(d).includes(token.toLowerCase());
}
function hasTrait(d: CardDefinition, token: string): boolean {
  const wanted = token.replaceAll(" ", "").toLowerCase();
  return d.types?.some((trait) => trait.replaceAll(" ", "").toLowerCase() === wanted) === true;
}
function mine(ctx: EffectContext, source: CardSource, pred: (d: CardDefinition, p: Permanent) => boolean): Permanent[] {
  return ctx.game
    .player(source.ownerSeat)
    .battleArea.filter((p) => p.topCard !== undefined && pred(ctx.game.definitionOf(p.topCard), p));
}
function foes(
  ctx: EffectContext,
  source: CardSource,
  pred: (d: CardDefinition, p: Permanent) => boolean = () => true,
): Permanent[] {
  return ctx.game
    .player(ctx.game.opponentOf(source.ownerSeat))
    .battleArea.filter(
      (p) =>
        p.topCard !== undefined &&
        isDigimon(ctx.game.definitionOf(p.topCard)) &&
        pred(ctx.game.definitionOf(p.topCard), p),
    );
}
async function chooseP(ctx: EffectContext, ps: Permanent[], max = 1, optional = false): Promise<string[]> {
  if (!ps.length) return [];
  return ctx.ask.chooseTargets(ctx, {
    candidates: ps.map(({ permanentId }) => permanentId),
    min: optional ? 0 : 1,
    max: Math.min(max, ps.length),
  });
}
async function chooseC(ctx: EffectContext, cs: CardInstance[], max = 1, optional = false): Promise<string[]> {
  if (!cs.length) return [];
  return ctx.ask.selectCards(ctx, {
    candidates: cs.map(({ instanceId }) => instanceId),
    min: optional ? 0 : 1,
    max: Math.min(max, cs.length),
    visibleCards: cs.map(({ instanceId, cardId }) => ({ instanceId, cardId })),
  });
}
async function reveal(
  ctx: EffectContext,
  source: CardSource,
  count: number,
  predicates: ((d: CardDefinition) => boolean)[],
  trashRest = false,
): Promise<void> {
  const shown = await ctx.fx.reveal(source.ownerSeat, count);
  const selected: string[] = [];
  for (const pred of predicates) {
    const picked = await chooseC(
      ctx,
      shown.filter((c) => !selected.includes(c.instanceId) && pred(ctx.game.definitionOf(c))),
      1,
      true,
    );
    selected.push(...picked);
  }
  if (selected.length) await ctx.fx.returnToHand(selected);
  const rest = shown.map(({ instanceId }) => instanceId).filter((id) => !selected.includes(id));
  if (rest.length) {
    if (trashRest) await ctx.fx.trash(rest, { byEffectSeat: source.ownerSeat });
    else await ctx.fx.returnToDeck(rest, { toTop: false });
  }
}
function blueTamer(d: CardDefinition): boolean {
  return isTamer(d) && d.colors.includes(CardColor.Blue);
}
function isQualifyingDracomonPlay(ctx: EffectContext, source: CardSource, self: Permanent): boolean {
  const playedId = ctx.trigger.subjectPermanentId;
  if (playedId === undefined || playedId === self.permanentId) return false;
  const played = ctx.game.permanentById(playedId);
  if (played?.controllerSeat !== source.ownerSeat || played.topCard === undefined) return false;
  const definition = ctx.game.definitionOf(played.topCard);
  const traits = definition.types?.map((trait) => trait.replaceAll(" ", "").toLowerCase()) ?? [];
  return (
    ctx.game.state.turnSeat === source.ownerSeat &&
    isDigimon(definition) &&
    (definition.nameEn.includes("Dramon") || traits.includes("blueflare"))
  );
}
function isOwnBlueTamerPlay(ctx: EffectContext, source: CardSource): boolean {
  const playedId = ctx.trigger.subjectPermanentId;
  if (playedId === undefined || ctx.game.state.turnSeat !== source.ownerSeat) return false;
  const played = ctx.game.permanentById(playedId);
  return (
    played?.controllerSeat === source.ownerSeat &&
    played.topCard !== undefined &&
    blueTamer(ctx.game.definitionOf(played.topCard))
  );
}
function isOwnTamerPlay(ctx: EffectContext, source: CardSource): boolean {
  const playedId = ctx.trigger.subjectPermanentId;
  if (playedId === undefined || !source.isOwnersTurn()) return false;
  const played = ctx.game.permanentById(playedId);
  return (
    played?.controllerSeat === source.ownerSeat &&
    played.topCard !== undefined &&
    isTamer(ctx.game.definitionOf(played.topCard))
  );
}
function named(d: CardDefinition, names: string[]): boolean {
  return names.some((name) => d.nameEn.includes(name));
}
async function playHand(
  ctx: EffectContext,
  source: CardSource,
  pred: (d: CardDefinition) => boolean,
  max = 1,
): Promise<void> {
  const picked = await chooseC(
    ctx,
    ctx.game.player(source.ownerSeat).hand.filter((c) => pred(ctx.game.definitionOf(c))),
    max,
    true,
  );
  if (picked.length) await ctx.fx.playInstances(picked, { payCost: false });
}
function otherSukamon(ctx: EffectContext, source: CardSource): Permanent[] {
  const self = source.permanent()?.permanentId;
  return [
    ...mine(ctx, source, (d, p) => p.permanentId !== self && isDigimon(d) && d.nameEn.includes("Sukamon")),
    ...foes(ctx, source, (d, p) => p.permanentId !== self && d.nameEn.includes("Sukamon")),
  ];
}
function sukamonPrevention(cardId: string, source: CardSource): Effect {
  return staticModifier({
    source,
    effectKey: `${cardId}/inherited-prevent`,
    description: "Delete another Sukamon to prevent this Digimon's deletion.",
    isInherited: true,
    resolve: async (ctx) => {
      const self = source.permanent();
      if (!self) return;
      ctx.fx.subscribeReplacement({
        event: "wouldBeDeleted",
        sourcePermanentId: self.permanentId,
        mode: "prevent",
        description: `${cardId}: Sukamon deletion prevention`,
        protects: (_ctx, id) => id === self.permanentId,
        preventCheck: async (runtime) => {
          const [cost] = await chooseP(runtime, otherSukamon(runtime, source), 1, true);
          return cost ? (await runtime.fx.deletePermanent([cost], "byEffect")) === 1 : false;
        },
      });
    },
  });
}

export function earlyMidBt11Module(cardId: string): EffectModule {
  return {
    cardId,
    effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
      switch (cardId) {
        case "BT11-020":
          if (timing === EffectTiming.OnPlay)
            return [
              onPlay({
                source,
                effectKey: `${cardId}/search`,
                description: "Reveal 3; add Gaogamon and blue Tamer; trash rest.",
                resolve: (ctx) =>
                  reveal(ctx, source, 3, [(d) => isDigimon(d) && d.nameEn.includes("Gaogamon"), blueTamer], true),
              }),
            ];
          if (timing === EffectTiming.OnAllyAttack)
            return [
              whenAttacking({
                source,
                effectKey: `${cardId}/inherited-bounce`,
                description: "With a Tamer, bounce an opposing level 3.",
                isInherited: true,
                maxPerTurn: 1,
                when: (ctx) => mine(ctx, source, isTamer).length > 0,
                resolve: async (ctx) => {
                  const [id] = await chooseP(
                    ctx,
                    foes(ctx, source, (d) => d.level === 3),
                  );
                  const top = id ? ctx.game.permanentById(id)?.topCard : undefined;
                  if (top) await ctx.fx.returnToHand([top.instanceId]);
                },
              }),
            ];
          return [];
        case "BT11-022":
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/play-watch`,
                description: "Draw 1 when another Dramon/Blue Flare Digimon is played.",
                maxPerTurn: 1,
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  ctx.fx.subscribeSubTrigger({
                    event: "whenPlayed",
                    sourcePermanentId: self.permanentId,
                    once: false,
                    oncePerTurnKey: `${cardId}/play-watch`,
                    description: `${cardId}: Dramon/Blue Flare played`,
                    matches: (sub) => isQualifyingDracomonPlay(sub, source, self),
                    run: async (sub) => {
                      await sub.fx.draw(source.ownerSeat, 1);
                    },
                  });
                },
              }),
              staticModifier({
                source,
                effectKey: `${cardId}/inherited-play-watch`,
                description: "Gain 1 memory when another Dramon/Blue Flare Digimon is played.",
                isInherited: true,
                maxPerTurn: 1,
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  ctx.fx.subscribeSubTrigger({
                    event: "whenPlayed",
                    sourcePermanentId: self.permanentId,
                    once: false,
                    oncePerTurnKey: `${cardId}/inherited-play-watch`,
                    description: `${cardId}: inherited Dramon/Blue Flare played`,
                    matches: (sub) => isQualifyingDracomonPlay(sub, source, self),
                    run: async (sub) => sub.fx.gainMemory(1),
                  });
                },
              }),
            ];
          return [];
        case "BT11-023":
          if (timing === EffectTiming.OnPlay)
            return [
              onPlay({
                source,
                effectKey: `${cardId}/search`,
                description: "Reveal 3; add Veedramon and blue Tamer; bottom rest.",
                resolve: (ctx) =>
                  reveal(ctx, source, 3, [(d) => isDigimon(d) && d.nameEn.includes("Veedramon"), blueTamer]),
              }),
            ];
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/inherited-tamer-memory`,
                description: "Gain 1 memory when a blue Tamer is played.",
                isInherited: true,
                maxPerTurn: 1,
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  ctx.fx.subscribeSubTrigger({
                    event: "whenPlayed",
                    sourcePermanentId: self.permanentId,
                    once: false,
                    oncePerTurnKey: `${cardId}/inherited-tamer-memory`,
                    description: `${cardId}: blue Tamer played`,
                    matches: (sub) => isOwnBlueTamerPlay(sub, source),
                    run: async (sub) => sub.fx.gainMemory(1),
                  });
                },
              }),
            ];
          return [];
        case "BT11-024":
          if (timing === EffectTiming.OnPlay)
            return [
              onPlay({
                source,
                effectKey: `${cardId}/place-draw`,
                description: "Place eligible blue Digimon from hand under this Digimon to draw 1.",
                optional: true,
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  const [cost] = await chooseC(
                    ctx,
                    ctx.game.player(source.ownerSeat).hand.filter((c) => {
                      const d = ctx.game.definitionOf(c);
                      return (
                        isDigimon(d) &&
                        ((d.colors.includes(CardColor.Blue) && d.level === 3) || has(d, "aqua") || has(d, "sea animal"))
                      );
                    }),
                    1,
                    true,
                  );
                  if (cost && (await ctx.fx.placeUnder(self.permanentId, [cost])).length)
                    await ctx.fx.draw(source.ownerSeat, 1);
                },
              }),
            ];
          return [];
        case "BT11-025":
          if (timing === EffectTiming.OnAllyAttack)
            return [
              whenAttacking({
                source,
                effectKey: `${cardId}/attack-memory`,
                description: "Gain memory if opponent has 8+ hand cards.",
                maxPerTurn: 1,
                when: (ctx) => ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).hand.length >= 8,
                resolve: async (ctx) => ctx.fx.gainMemory(1),
              }),
              whenAttacking({
                source,
                effectKey: `${cardId}/inherited-bounce`,
                description: "With a Tamer, bounce level 3.",
                isInherited: true,
                maxPerTurn: 1,
                when: (ctx) => mine(ctx, source, isTamer).length > 0,
                resolve: async (ctx) => {
                  const [id] = await chooseP(
                    ctx,
                    foes(ctx, source, (d) => d.level === 3),
                  );
                  const top = id ? ctx.game.permanentById(id)?.topCard : undefined;
                  if (top) await ctx.fx.returnToHand([top.instanceId]);
                },
              }),
            ];
          return [];
        case "BT11-027":
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/blue-tamer-watch`,
                description: "Draw 1 when you play a blue Tamer.",
                maxPerTurn: 1,
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  ctx.fx.subscribeSubTrigger({
                    event: "whenPlayed",
                    sourcePermanentId: self.permanentId,
                    once: false,
                    oncePerTurnKey: `${cardId}/blue-tamer-watch`,
                    description: `${cardId}: blue Tamer played`,
                    matches: (sub) => isOwnBlueTamerPlay(sub, source),
                    run: async (sub) => {
                      await sub.fx.draw(source.ownerSeat, 1);
                    },
                  });
                },
              }),
              staticModifier({
                source,
                effectKey: `${cardId}/inherited-blue-tamer-watch`,
                description: "Gain 1 memory when you play a blue Tamer.",
                isInherited: true,
                maxPerTurn: 1,
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  ctx.fx.subscribeSubTrigger({
                    event: "whenPlayed",
                    sourcePermanentId: self.permanentId,
                    once: false,
                    oncePerTurnKey: `${cardId}/inherited-blue-tamer-watch`,
                    description: `${cardId}: inherited blue Tamer played`,
                    matches: (sub) => isOwnBlueTamerPlay(sub, source),
                    run: async (sub) => sub.fx.gainMemory(1),
                  });
                },
              }),
            ];
          return [];
        case "BT11-028":
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/blocker-dp`,
                description: "Gain Blocker and +2000 per 4 opposing hand cards.",
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.UntilOpponentTurnEnd);
                  const bonus =
                    Math.floor(ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).hand.length / 4) * 2000;
                  if (bonus) ctx.fx.modifyDP(self.permanentId, bonus, EffectDuration.UntilOpponentTurnEnd);
                },
              }),
            ];
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/inherited-unsuspend`,
                description: "Unsuspend when an effect adds cards to opponent hand.",
                isInherited: true,
                maxPerTurn: 1,
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  ctx.fx.subscribeSubTrigger({
                    event: "whenEffectAddsToOpponentHand",
                    sourcePermanentId: self.permanentId,
                    once: false,
                    oncePerTurnKey: `${cardId}/inherited-unsuspend`,
                    description: `${cardId}: opponent hand added`,
                    run: async (sub) => sub.fx.unsuspend([self.permanentId]),
                  });
                },
              }),
            ];
          return [];
        case "BT11-029":
          if (timing === EffectTiming.OnDeclaration)
            return [
              activated({
                source,
                effectKey: `${cardId}/main-search`,
                description: "Suspend this Digimon, reveal 3 and add all blue Tamers.",
                maxPerTurn: 1,
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self || self.isSuspended) return;
                  await ctx.fx.suspend([self.permanentId]);
                  const shown = await ctx.fx.reveal(source.ownerSeat, 3);
                  const picked = shown
                    .filter((c) => blueTamer(ctx.game.definitionOf(c)))
                    .map(({ instanceId }) => instanceId);
                  if (picked.length) await ctx.fx.returnToHand(picked);
                  const rest = shown.map(({ instanceId }) => instanceId).filter((id) => !picked.includes(id));
                  if (rest.length) await ctx.fx.returnToDeck(rest, { toTop: false });
                },
              }),
            ];
          if (timing === EffectTiming.OnAllyAttack)
            return [
              whenAttacking({
                source,
                effectKey: `${cardId}/inherited-rina-on-play`,
                description: "Activate 1 of your Rina Shinomiya's On Play effects.",
                isInherited: true,
                maxPerTurn: 1,
                resolve: async (ctx) => {
                  const [rinaId] = await chooseP(
                    ctx,
                    mine(ctx, source, (definition) => isTamer(definition) && definition.nameEn === "Rina Shinomiya"),
                  );
                  if (rinaId !== undefined) {
                    await ctx.fx.reactivateOnPlay?.(rinaId, {
                      timings: [EffectTiming.OnPlay],
                      chooseOne: true,
                    });
                  }
                },
              }),
            ];
          return [];
        case "BT11-030":
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/aliases-armor`,
                description: "MetalGreymon/Cyberdramon aliases and Armor Purge.",
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  ctx.fx.grantNameTrait(
                    self.permanentId,
                    "name",
                    ["MetalGreymon", "Cyberdramon"],
                    EffectDuration.Permanent,
                  );
                  ctx.fx.grantKeyword(self.permanentId, "ArmorPurge", EffectDuration.Permanent);
                },
              }),
            ];
          if (timing === EffectTiming.OnPlay || timing === EffectTiming.WhenDigivolving)
            return [
              (timing === EffectTiming.OnPlay ? onPlay : whenDigivolving)({
                source,
                effectKey: `${cardId}/place-bounce`,
                description:
                  "Place Blue Flare under self and bottom-deck level 3, plus level 4 with Cyberdramon source.",
                optional: true,
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  const pool = [...ctx.game.player(source.ownerSeat).hand];
                  for (const p of mine(ctx, source, isTamer)) pool.push(...p.stack);
                  const [item] = await chooseC(
                    ctx,
                    pool.filter((c) => {
                      const definition = ctx.game.definitionOf(c);
                      return (
                        isDigimon(definition) &&
                        definition.types?.some((trait) => trait.replaceAll(" ", "").toLowerCase() === "blueflare") ===
                          true
                      );
                    }),
                    1,
                    true,
                  );
                  if (item) await ctx.fx.placeUnder(self.permanentId, [item]);
                  const cap = self.stack.some((c) => {
                    const definition = ctx.game.definitionOf(c);
                    return definition.cardId === cardId || definition.nameEn.includes("Cyberdramon");
                  })
                    ? 4
                    : 3;
                  const [id] = await chooseP(
                    ctx,
                    foes(ctx, source, (d) => (d.level ?? 99) <= cap),
                  );
                  const top = id ? ctx.game.permanentById(id)?.topCard : undefined;
                  if (top) await ctx.fx.returnToDeck([top.instanceId], { toTop: false });
                },
              }),
            ];
          return [];
        case "BT11-031":
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/unsuspend-memory`,
                description: "Unsuspend, then gain 2 with Blue Flare/Xros Heart source and 2+ foes.",
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  await ctx.fx.unsuspend([self.permanentId]);
                  if (
                    foes(ctx, source).length >= 2 &&
                    self.stack.some(
                      (c) =>
                        hasTrait(ctx.game.definitionOf(c), "blue flare") ||
                        hasTrait(ctx.game.definitionOf(c), "xros heart"),
                    )
                  )
                    ctx.fx.gainMemory(2);
                },
              }),
            ];
          if (timing === EffectTiming.OnDestroyedAnyone)
            return [
              onDeletion({
                source,
                effectKey: `${cardId}/save`,
                description: "Save under a General Tamer.",
                optional: true,
                resolve: async (ctx) => {
                  const [saveTamer] = await chooseP(
                    ctx,
                    mine(ctx, source, (d) => isTamer(d)),
                    1,
                    true,
                  );
                  if (saveTamer) await ctx.fx.placeUnder(saveTamer, [source.instanceId]);

                  const [general] = await chooseP(
                    ctx,
                    mine(ctx, source, (d) => isTamer(d) && hasTrait(d, "general")),
                    1,
                    true,
                  );
                  if (!general) return;
                  const trash = ctx.game.player(source.ownerSeat).trash;
                  const [greymon] = await chooseC(
                    ctx,
                    trash.filter((card) => {
                      const definition = ctx.game.definitionOf(card);
                      return (
                        isDigimon(definition) &&
                        definition.colors.includes(CardColor.Blue) &&
                        definition.nameEn.includes("Greymon")
                      );
                    }),
                    1,
                    true,
                  );
                  const [mailBirdramon] = await chooseC(
                    ctx,
                    trash.filter((card) => {
                      const definition = ctx.game.definitionOf(card);
                      return (
                        isDigimon(definition) &&
                        definition.colors.includes(CardColor.Blue) &&
                        definition.nameEn.includes("MailBirdramon")
                      );
                    }),
                    1,
                    true,
                  );
                  const cards = [greymon, mailBirdramon].filter((id): id is string => id !== undefined);
                  if (cards.length) await ctx.fx.placeUnder(general, cards);
                },
              }),
            ];
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/inherited-blocker`,
                description: "Blue Flare host gains Blocker on opponent turn.",
                isInherited: true,
                when: (ctx) =>
                  !source.isOwnersTurn() &&
                  !!source.permanent()?.topCard &&
                  hasTrait(ctx.game.definitionOf(source.permanent()!.topCard!), "blue flare"),
                resolve: async (ctx) => {
                  const host = source.permanent();
                  if (host) ctx.fx.grantKeyword(host.permanentId, "Blocker", EffectDuration.Permanent);
                },
              }),
            ];
          return [];
        case "BT11-032":
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/play-tamer`,
                description: "Play a blue Tamer from hand.",
                optional: true,
                resolve: (ctx) => playHand(ctx, source, blueTamer),
              }),
            ];
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/blue-tamer-unsuspend`,
                description: "Unsuspend this Digimon when you play a blue Tamer.",
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  ctx.fx.subscribeSubTrigger({
                    event: "whenPlayed",
                    sourcePermanentId: self.permanentId,
                    once: false,
                    description: `${cardId}: blue Tamer played`,
                    matches: (sub) => isOwnBlueTamerPlay(sub, source),
                    run: async (sub) => sub.fx.unsuspend([self.permanentId]),
                  });
                },
              }),
            ];
          if (timing === EffectTiming.OnUnTappedAnyone)
            return [
              turnTiming({
                source,
                effectKey: `${cardId}/bounce`,
                description: "When this unsuspends, bounce level <= 3 + blue Tamers.",
                maxPerTurn: 1,
                when: (ctx) => ctx.trigger.unsuspendedPermanentId === source.permanent()?.permanentId,
                resolve: async (ctx) => {
                  const cap = 3 + mine(ctx, source, blueTamer).length;
                  const [id] = await chooseP(
                    ctx,
                    foes(ctx, source, (d) => (d.level ?? 99) <= cap),
                  );
                  const top = id ? ctx.game.permanentById(id)?.topCard : undefined;
                  if (top) await ctx.fx.returnToHand([top.instanceId]);
                },
              }),
            ];
          return [];
        case "BT11-034":
          if (timing === EffectTiming.OnPlay)
            return [
              onPlay({
                source,
                effectKey: `${cardId}/place-xros`,
                description: "Place 1 or 2 Xros Heart Digimon from trash under a Tamer.",
                resolve: async (ctx) => {
                  const max = mine(
                    ctx,
                    source,
                    (d, p) =>
                      d.nameEn.includes("Dorulumon") ||
                      p.stack.some((c) => ctx.game.definitionOf(c).nameEn.includes("Dorulumon")),
                  ).length
                    ? 2
                    : 1;
                  const picked = await chooseC(
                    ctx,
                    ctx.game
                      .player(source.ownerSeat)
                      .trash.filter(
                        (c) => isDigimon(ctx.game.definitionOf(c)) && hasTrait(ctx.game.definitionOf(c), "xros heart"),
                      ),
                    max,
                    true,
                  );
                  if (picked.length) {
                    const [tamer] = await chooseP(ctx, mine(ctx, source, isTamer));
                    if (tamer) await ctx.fx.placeUnder(tamer, picked);
                  }
                },
              }),
            ];
          return [];
        case "BT11-036":
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/sukamon-reducer`,
                description: "Reduce evolution into Sukamon by 1.",
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  ctx.fx.subscribeReplacement({
                    event: "wouldDigivolve",
                    sourcePermanentId: self.permanentId,
                    mode: "reduceCost",
                    amount: 1,
                    description: `${cardId}: Sukamon cost -1`,
                    appliesTo: (p) => p.permanentId === self.permanentId,
                    intoMatches: (d) => d.nameEn.includes("Sukamon"),
                  });
                },
              }),
            ];
          if (timing === EffectTiming.OnDestroyedAnyone)
            return [
              onDeletion({
                source,
                effectKey: `${cardId}/inherited-play`,
                description: "Play Chuumon from trash suspended.",
                isInherited: true,
                optional: true,
                when: (ctx) => {
                  const deletedTopCardId = ctx.trigger.deletedTopCardId;
                  if (deletedTopCardId === undefined) return false;
                  const definition = ctx.game.definitionOf({ cardId: deletedTopCardId } as CardInstance);
                  return definition.nameEn.includes("Sukamon") || definition.nameEn.includes("Etemon");
                },
                resolve: async (ctx) => {
                  const picked = await chooseC(
                    ctx,
                    ctx.game
                      .player(source.ownerSeat)
                      .trash.filter((c) => ctx.game.definitionOf(c).nameEn === "Chuumon"),
                    1,
                    true,
                  );
                  if (picked.length) await ctx.fx.playInstances(picked, { payCost: false, suspended: true });
                },
              }),
            ];
          return [];
        case "BT11-040":
          if (timing === EffectTiming.OnDestroyedAnyone)
            return [
              onDeletion({
                source,
                effectKey: `${cardId}/reveal`,
                description: "Reveal 3; add Chuumon/Sukamon/Etemon; trash rest.",
                resolve: (ctx) => reveal(ctx, source, 3, [(d) => named(d, ["Chuumon", "Sukamon", "Etemon"])], true),
              }),
            ];
          if (timing === EffectTiming.None) return [sukamonPrevention(cardId, source)];
          return [];
        case "BT11-041":
          if (timing === EffectTiming.OnPlay || timing === EffectTiming.WhenDigivolving)
            return [
              (timing === EffectTiming.OnPlay ? onPlay : whenDigivolving)({
                source,
                effectKey: `${cardId}/trash-debuff`,
                description: "Trash Sukamon from hand/source to give -3000 DP and SA-1.",
                optional: true,
                resolve: async (ctx) => {
                  const self = source.permanent();
                  const pool = [...ctx.game.player(source.ownerSeat).hand, ...(self?.stack ?? [])].filter((c) =>
                    ctx.game.definitionOf(c).nameEn.includes("Sukamon"),
                  );
                  const [cost] = await chooseC(ctx, pool, 1, true);
                  if (!cost || !(await ctx.fx.trash([cost], { byEffectSeat: source.ownerSeat })).length) return;
                  const [id] = await chooseP(ctx, foes(ctx, source));
                  if (id) {
                    ctx.fx.modifyDP(id, -3000, EffectDuration.UntilOpponentTurnEnd);
                    ctx.fx.grantKeyword(id, "SecurityAttack", EffectDuration.UntilOpponentTurnEnd, -1);
                  }
                },
              }),
            ];
          if (timing === EffectTiming.None) return [sukamonPrevention(cardId, source)];
          return [];
        case "BT11-042":
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/security-search`,
                description: "Add Angel family from security, recover from deck, shuffle security.",
                optional: true,
                resolve: async (ctx) => {
                  const security = ctx.game
                    .player(source.ownerSeat)
                    .security.filter((c) =>
                      ["angel", "archangel", "fallen angel"].some((trait) => hasTrait(ctx.game.definitionOf(c), trait)),
                    );
                  const picked = await chooseC(ctx, security, 1, true);
                  if (!picked.length) return;
                  await ctx.fx.returnToHand(picked);
                  const top = ctx.game.player(source.ownerSeat).deck[0];
                  if (top) await ctx.fx.addSecurity(source.ownerSeat, [top.instanceId], { toTop: true, faceUp: false });
                  ctx.fx.shuffleSecurity(source.ownerSeat);
                },
              }),
            ];
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/lady-mirei-memory`,
                description: "Gain 1 memory when you play LadyDevimon or Mirei Mikagura.",
                maxPerTurn: 1,
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  ctx.fx.subscribeSubTrigger({
                    event: "whenPlayed",
                    sourcePermanentId: self.permanentId,
                    once: false,
                    oncePerTurnKey: `${cardId}/lady-mirei-memory`,
                    description: `${cardId}: LadyDevimon/Mirei played`,
                    matches: (sub) => {
                      const playedId = sub.trigger.subjectPermanentId;
                      if (playedId === undefined || sub.game.state.turnSeat !== source.ownerSeat) return false;
                      const played = sub.game.permanentById(playedId);
                      if (played?.controllerSeat !== source.ownerSeat || played.topCard === undefined) return false;
                      return ["LadyDevimon", "Mirei Mikagura"].includes(sub.game.definitionOf(played.topCard).nameEn);
                    },
                    run: async (sub) => sub.fx.gainMemory(1),
                  });
                },
              }),
              staticModifier({
                source,
                effectKey: `${cardId}/inherited-angel-blocker`,
                description:
                  "On the opponent's turn, Angel family Digimon gain Blocker while you have a purple Digimon.",
                isInherited: true,
                when: (ctx) =>
                  !source.isOwnersTurn() &&
                  mine(
                    ctx,
                    source,
                    (definition) => isDigimon(definition) && definition.colors.includes(CardColor.Purple),
                  ).length > 0,
                resolve: async (ctx) => {
                  for (const permanent of mine(
                    ctx,
                    source,
                    (definition) =>
                      isDigimon(definition) &&
                      ["angel", "archangel", "fallen angel"].some((trait) => hasTrait(definition, trait)),
                  )) {
                    ctx.fx.grantKeyword(permanent.permanentId, "Blocker", EffectDuration.Permanent);
                  }
                },
              }),
            ];
          return [];
        case "BT11-043":
          if (timing === EffectTiming.OnPlay || timing === EffectTiming.WhenDigivolving)
            return [
              (timing === EffectTiming.OnPlay ? onPlay : whenDigivolving)({
                source,
                effectKey: `${cardId}/make-sukamon`,
                description: "Conditionally turn an opposing Digimon into white 3000 DP Sukamon.",
                when: (ctx) =>
                  ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).trash.length >= 16 ||
                  ctx.game
                    .player(source.ownerSeat)
                    .trash.filter((c) => ctx.game.definitionOf(c).nameEn.includes("Sukamon")).length >= 3,
                resolve: async (ctx) => {
                  const [id] = await chooseP(ctx, foes(ctx, source));
                  if (id) {
                    ctx.fx.setBaseDP(id, 3000, EffectDuration.UntilOpponentTurnEnd);
                    ctx.fx.setOriginalCardInfo(
                      id,
                      { name: "Sukamon", colors: [CardColor.White] },
                      EffectDuration.UntilOpponentTurnEnd,
                    );
                  }
                },
              }),
            ];
          if (timing === EffectTiming.OnAllyAttack)
            return [
              whenAttacking({
                source,
                effectKey: `${cardId}/attack-sa`,
                description: "Gain SA+1 per other Sukamon.",
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  const count = [
                    ...mine(ctx, source, (d, p) => p.permanentId !== self.permanentId && d.nameEn.includes("Sukamon")),
                    ...foes(ctx, source, (d) => d.nameEn.includes("Sukamon")),
                  ].length;
                  if (count)
                    ctx.fx.grantKeyword(self.permanentId, "SecurityAttack", EffectDuration.UntilEachTurnEnd, count);
                },
              }),
            ];
          if (timing === EffectTiming.None) return [sukamonPrevention(cardId, source)];
          return [];
        case "BT11-044":
          if (timing === EffectTiming.OnPlay || timing === EffectTiming.WhenDigivolving)
            return [
              (timing === EffectTiming.OnPlay ? onPlay : whenDigivolving)({
                source,
                effectKey: `${cardId}/reveal-play`,
                description: "Reveal 4; play Chuumon/Sukamon/Etemon totaling cost 7; trash rest.",
                resolve: async (ctx) => {
                  const shown = await ctx.fx.reveal(source.ownerSeat, 4);
                  const eligible = shown.filter((c) =>
                    named(ctx.game.definitionOf(c), ["Chuumon", "Sukamon", "Etemon"]),
                  );
                  const picked = await ctx.ask.selectCards(ctx, {
                    candidates: eligible.map(({ instanceId }) => instanceId),
                    min: 0,
                    max: eligible.length,
                    maxTotalPlayCost: 7,
                    visibleCards: shown.map(({ instanceId, cardId: visibleCardId }) => ({
                      instanceId,
                      cardId: visibleCardId,
                    })),
                  });
                  if (picked.length) await ctx.fx.playInstances(picked, { payCost: false });
                  const rest = shown.map(({ instanceId }) => instanceId).filter((id) => !picked.includes(id));
                  if (rest.length) await ctx.fx.trash(rest, { byEffectSeat: source.ownerSeat });
                },
              }),
            ];
          return [];
        case "BT11-045":
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/recovery`,
                description: "At 5 or fewer security, recover 1 from deck.",
                when: (ctx) => ctx.game.player(source.ownerSeat).security.length <= 5,
                resolve: async (ctx) => {
                  const top = ctx.game.player(source.ownerSeat).deck[0];
                  if (top) await ctx.fx.addSecurity(source.ownerSeat, [top.instanceId], { toTop: true, faceUp: false });
                },
              }),
            ];
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/security-minus`,
                description: "When security removed on opponent turn, give -4000 DP.",
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  ctx.fx.subscribeSubTrigger({
                    event: "whenSecurityRemoved",
                    sourcePermanentId: self.permanentId,
                    once: false,
                    description: `${cardId}: own security removed on opponent's turn`,
                    matches: (sub) =>
                      sub.trigger.removedFromSecuritySeat === source.ownerSeat && !source.isOwnersTurn(),
                    run: async (sub) => {
                      const [id] = await chooseP(sub, foes(sub, source));
                      if (id) sub.fx.modifyDP(id, -4000, EffectDuration.UntilEachTurnEnd);
                    },
                  });
                },
              }),
            ];
          return [];
        case "BT11-050":
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/inherited-tamer-suspend`,
                description: "When a Tamer is played, suspend opponent Digimon.",
                isInherited: true,
                maxPerTurn: 1,
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (!self) return;
                  ctx.fx.subscribeSubTrigger({
                    event: "whenPlayed",
                    sourcePermanentId: self.permanentId,
                    once: false,
                    oncePerTurnKey: `${source.instanceId}/${cardId}/inherited-tamer-suspend`,
                    description: `${cardId}: Tamer played`,
                    matches: (sub) => isOwnTamerPlay(sub, source),
                    run: async (sub) => {
                      const [id] = await chooseP(sub, foes(sub, source));
                      if (id) await sub.fx.suspend([id], { byEffectSeat: source.ownerSeat });
                    },
                  });
                },
              }),
            ];
          return [];
        case "BT11-054":
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/leomon-alias`,
                description: "Also Leomon.",
                resolve: async (ctx) => {
                  const self = source.permanent();
                  if (self) ctx.fx.grantNameTrait(self.permanentId, "name", ["Leomon"], EffectDuration.Permanent);
                },
              }),
              staticModifier({
                source,
                effectKey: `${cardId}/inherited-effect-play-rush`,
                description: "When another Digimon is played by an effect, grant Rush.",
                isInherited: true,
                maxPerTurn: 1,
                when: () => source.isOwnersTurn(),
                resolve: async (ctx) => {
                  const host = source.permanent();
                  if (!host) return;
                  ctx.fx.subscribeSubTrigger({
                    event: "whenPlayed",
                    sourcePermanentId: host.permanentId,
                    once: false,
                    oncePerTurnKey: `${source.instanceId}/${cardId}/inherited-effect-play-rush`,
                    description: `${cardId}: another Digimon played by an effect`,
                    matches: (sub) => {
                      const playedId = sub.trigger.subjectPermanentId;
                      if (
                        playedId === undefined ||
                        playedId === host.permanentId ||
                        sub.trigger.playedByEffect !== true
                      )
                        return false;
                      const played = sub.game.permanentById(playedId);
                      return (
                        source.isOwnersTurn() &&
                        played?.controllerSeat === source.ownerSeat &&
                        played.topCard !== undefined &&
                        isDigimon(sub.game.definitionOf(played.topCard))
                      );
                    },
                    run: async (sub) => {
                      const [id] = await chooseP(sub, mine(sub, source, isDigimon));
                      if (id) sub.fx.grantKeyword(id, "Rush", EffectDuration.UntilEachTurnEnd);
                    },
                  });
                },
              }),
            ];
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/play-tamer`,
                description: "Play green/blue Tamer cost 4 or less.",
                optional: true,
                resolve: (ctx) =>
                  playHand(
                    ctx,
                    source,
                    (d) =>
                      isTamer(d) &&
                      d.playCost <= 4 &&
                      (d.colors.includes(CardColor.Green) || d.colors.includes(CardColor.Blue)),
                  ),
              }),
            ];
          return [];
        case "BT11-055":
          if (timing === EffectTiming.OnPlay || timing === EffectTiming.WhenDigivolving)
            return [
              (timing === EffectTiming.OnPlay ? onPlay : whenDigivolving)({
                source,
                effectKey: `${cardId}/suspend-lock`,
                description: "Suspend per green/black Tamer, then prevent one suspended foe's next unsuspend.",
                resolve: async (ctx) => {
                  const count = mine(
                    ctx,
                    source,
                    (d) => isTamer(d) && (d.colors.includes(CardColor.Green) || d.colors.includes(CardColor.Black)),
                  ).length;
                  const ids = await chooseP(
                    ctx,
                    foes(ctx, source, (_d, p) => !p.isSuspended),
                    count,
                    true,
                  );
                  if (ids.length) await ctx.fx.suspend(ids, { byEffectSeat: source.ownerSeat });
                  const [locked] = await chooseP(
                    ctx,
                    foes(ctx, source, (_d, p) => p.isSuspended),
                  );
                  if (locked) ctx.fx.restrict(locked, "unsuspend", EffectDuration.UntilOwnerActivePhase);
                },
              }),
            ];
          if (timing === EffectTiming.None)
            return [
              staticModifier({
                source,
                effectKey: `${cardId}/inherited-battle-security-trash`,
                description: "When the host deletes in battle, trash top opposing security.",
                isInherited: true,
                maxPerTurn: 1,
                resolve: async (ctx) => {
                  const host = source.permanent();
                  if (!host) return;
                  ctx.fx.subscribeSubTrigger({
                    event: "whenDeletesInBattle",
                    sourcePermanentId: host.permanentId,
                    once: false,
                    oncePerTurnKey: `${source.instanceId}/${cardId}/inherited-battle-security-trash`,
                    description: `${cardId}: host deleted an opponent in battle`,
                    matches: (sub) =>
                      sub.trigger.attackerPermanentId === host.permanentId &&
                      sub.game.permanentById(host.permanentId) !== undefined,
                    run: async (sub) => {
                      await sub.fx.trashFromSecurity(sub.game.opponentOf(source.ownerSeat), 1, { fromTop: true });
                    },
                  });
                },
              }),
            ];
          return [];
        case "BT11-056":
          if (timing === EffectTiming.WhenDigivolving)
            return [
              whenDigivolving({
                source,
                effectKey: `${cardId}/reveal-tamer`,
                description: "Reveal 3; play a Tamer; put rest top or bottom.",
                resolve: async (ctx) => {
                  const shown = await ctx.fx.reveal(source.ownerSeat, 3);
                  const picked = await chooseC(
                    ctx,
                    shown.filter((c) => isTamer(ctx.game.definitionOf(c))),
                    1,
                    true,
                  );
                  if (picked.length) await ctx.fx.playInstances(picked, { payCost: false });
                  const rest = shown.map(({ instanceId }) => instanceId).filter((id) => !picked.includes(id));
                  if (rest.length) await ctx.fx.returnToDeck(rest, { toTop: false });
                },
              }),
            ];
          if (timing === EffectTiming.OnAllyAttack)
            return [
              whenAttacking({
                source,
                effectKey: `${cardId}/attack-reveal-play`,
                description: "Reveal per green/black Tamer; play green/black Digimon totaling cost 10.",
                maxPerTurn: 1,
                resolve: async (ctx) => {
                  const count = mine(
                    ctx,
                    source,
                    (d) => isTamer(d) && (d.colors.includes(CardColor.Green) || d.colors.includes(CardColor.Black)),
                  ).length;
                  if (count === 0) return;
                  const shown = await ctx.fx.reveal(source.ownerSeat, count);
                  const eligible = shown.filter((c) => {
                    const definition = ctx.game.definitionOf(c);
                    return (
                      isDigimon(definition) &&
                      (definition.colors.includes(CardColor.Green) || definition.colors.includes(CardColor.Black))
                    );
                  });
                  const picked = await ctx.ask.selectCards(ctx, {
                    candidates: eligible.map(({ instanceId }) => instanceId),
                    min: 0,
                    max: eligible.length,
                    maxTotalPlayCost: 10,
                    visibleCards: shown.map(({ instanceId, cardId: visibleCardId }) => ({
                      instanceId,
                      cardId: visibleCardId,
                    })),
                  });
                  if (picked.length) await ctx.fx.playInstances(picked, { payCost: false });
                  const rest = shown.map(({ instanceId }) => instanceId).filter((id) => !picked.includes(id));
                  if (rest.length) await ctx.fx.returnToDeck(rest, { toTop: false });
                },
              }),
            ];
          return [];
        default:
          return [];
      }
    },
  };
}
