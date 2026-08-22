// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT9-081 — Purple Lv.6 Digimon (BT9, DexDorugoramon).
//
// Digivolve: 2 from [Dorugoramon]
// [When Digivolving] If this Digimon has [Dorugoramon] in its digivolution cards or is
//   digivolving from the trash, delete all of your opponent's Digimon with the lowest level.
// [On Deletion] You may play 1 purple or black level 3 Digimon from your trash without paying
//   its memory cost. If you have 5 or more cards with [Dex] or [DeathX] in their names in your
//   trash, you may ALSO play 1 [DeathXmon] from your trash without paying its cost instead.
//
// The "digivolutionRequirement" is structural and not re-handled here.

const cardId = "BT9-081";

function hasDorugoramonInStack(ctx: EffectContext, source: CardSource): boolean {
  const perm = source.permanent();
  if (perm === undefined) return false;
  return Array.from(perm.stack).some((card) => ctx.game.definitionOf(card).nameEn === "Dorugoramon");
}

function isDigivolvingFromTrash(ctx: EffectContext): boolean {
  return ctx.trigger.digivolvedFromZone === "trash";
}

function oppMinLevelDigimons(ctx: EffectContext, source: CardSource): Permanent[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  const digimons = Array.from(opponent.battleArea).filter((p) => {
    if (p.topCard == null) return false;
    return isDigimon(ctx.game.definitionOf(p.topCard));
  });
  if (digimons.length === 0) return [];
  const minLevel = Math.min(...digimons.map((p) => ctx.game.definitionOf(p.topCard!).level ?? 99));
  return digimons.filter((p) => (ctx.game.definitionOf(p.topCard!).level ?? 99) === minLevel);
}

function onDeletionCandidates(ctx: EffectContext, source: CardSource) {
  const owner = ctx.game.player(source.ownerSeat);
  const dexCount = Array.from(owner.trash).filter((card) => {
    const name = ctx.game.definitionOf(card).nameEn;
    return name.includes("Dex") || name.includes("DeathX");
  }).length;

  return Array.from(owner.trash).filter((card) => {
    const def = ctx.game.definitionOf(card);
    if (!isDigimon(def)) return false;
    if (def.level === 3 && (def.colors.includes("Purple" as never) || def.colors.includes("Black" as never)))
      return true;
    return dexCount >= 5 && def.nameEn === "DeathXmon";
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-delete`,
          description:
            "[When Digivolving] If this Digimon has [Dorugoramon] in its digivolution cards " +
            "or is digivolving from the trash, delete all of your opponent's Digimon with the lowest level.",
          canActivate: (ctx) => {
            if (!hasDorugoramonInStack(ctx, source) && !isDigivolvingFromTrash(ctx)) return false;
            return oppMinLevelDigimons(ctx, source).length > 0;
          },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { zone: "trash", controller: "mine", kind: ["Digimon"], levels: [3], colors: ["Purple", "Black"] }, count: 1 },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "PlayWithoutCost",
          target: { filter: { zone: "trash", controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["DeathXmon"], match: "name" }] }, count: 1 },
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: { kind: "selfHasMinTrash", count: 5, filter: { nameOrTrait: [{ tokens: ["Dex", "DeathX"], match: "name" }] }, raw: "you have 5 or more cards with [Dex] or [DeathX] in their names in your trash" },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-081", compiled);
