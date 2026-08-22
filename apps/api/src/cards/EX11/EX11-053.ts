// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }]
              },
              count: 1,
              from: ["hand"]
            },
            raw: "By placing 1 [Royal Knight] trait Digimon card from your hand as the bottom digivolution card of any of your [King Drasil_7D6]s on the field",
            underFilter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["King Drasil_7D6"], match: "name" }]
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "target"
          },
          optional: true,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const royalKnightCards = Array.from(owner.hand).filter((c) => isRoyalKnight(ctx.game.definitionOf(c)));
            if (royalKnightCards.length === 0) return;
            const kingDrasilPerms = [
              ...Array.from(owner.battleArea),
              ...(owner.breeding ? [owner.breeding] : []),
            ].filter((p) => p.topCard !== undefined && isKingDrasil(ctx.game.definitionOf(p.topCard)));
            if (kingDrasilPerms.length === 0) return;
            const chosenCard = await ctx.ask.selectCards(ctx, {
              candidates: royalKnightCards.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosenCard.length === 0) return;
            const chosenHost = await ctx.ask.chooseTargets(ctx, {
              candidates: kingDrasilPerms.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (chosenHost.length === 0) return;
            await ctx.fx.placeUnder(chosenHost[0]!, chosenCard);
            await ctx.fx.draw(source.ownerSeat, 1);
          },
          from: ["hand", "digivolutionCards"],
          payCost: false,
          optional: true,
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            if (owner.security.length > 1) return;
            const omnimonCards = Array.from(owner.hand)
              .filter((card) => isOmnimonXAntibody(ctx.game.definitionOf(card)))
              .map((card) => ({ instanceId: card.instanceId }));
            const kingDrasilHosts = [
              ...Array.from(owner.battleArea),
              ...(owner.breeding ? [owner.breeding] : []),
            ].filter(
              (permanent) => permanent.topCard !== undefined && isKingDrasil(ctx.game.definitionOf(permanent.topCard)),
            );
            for (const host of kingDrasilHosts) {
              for (const card of host.stack) {
                if (isOmnimonXAntibody(ctx.game.definitionOf(card))) {
                  omnimonCards.push({ instanceId: card.instanceId });
                }
              }
            }
            if (omnimonCards.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: omnimonCards.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                const played = await ctx.fx.playInstances(chosen, { payCost: false });
                if (played.length > 0) {
                  await ctx.fx.placeUnder(played[0]!.permanentId, [source.instanceId]);
                }
              }
            }
          },
        }),
      ];
    }
  ],
  coverage: "full",
  residual: []
};

registerIrCard("EX11-053", compiled);
