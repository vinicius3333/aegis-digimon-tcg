import {
  CardKind,
  getCardDefinition,
  type CardInstance,
  type GameState,
  type Permanent,
  type PlayerState,
  type ServerEvent,
} from "@aegis/shared";
import { demoKeywordName, type DemoKeyword } from "./arenaDemoKeywords";

export const ARENA_VISUAL_ZONE_KEYWORDS = [
  "Save",
  "MaterialSave",
  "DigiBurst",
  "Detach",
  "Link",
  "Mind Link",
  "Armor Purge",
  "DeDigivolve",
] as const satisfies readonly DemoKeyword[];

export interface ArenaVisualZonePreparation {
  keyword: DemoKeyword;
  state: GameState;
  actor: Permanent;
  own: PlayerState;
  opp: PlayerState;
}

export interface ArenaVisualZoneContext extends ArenaVisualZonePreparation {
  portuguese: boolean;
  stage: (
    atMs: number,
    portugueseLabel: string,
    englishLabel: string,
    events: readonly ServerEvent[],
    change?: () => void,
  ) => void;
}

function ownTamer(own: PlayerState): Permanent | undefined {
  return own.battleArea.find(
    (permanent) => !!getCardDefinition(permanent.topCard?.cardId ?? "")?.kinds.includes(CardKind.Tamer),
  );
}

/** These cards are public at their destination; hidden opponent zones stay untouched. */
function movement(cards: readonly CardInstance[], from: string, to: string, seat: 0 | 1): ServerEvent {
  return {
    kind: "cardsMoved",
    instanceIds: cards.map((card) => card.instanceId),
    cardIds: cards.map((card) => card.cardId),
    from,
    to,
    seat,
  };
}

/** Seed a visible link using a public source, keeping the same physical card and ID. */
export function prepareArenaVisualZoneScene({ keyword, state, actor, opp }: ArenaVisualZonePreparation): void {
  if (["Save", "MaterialSave", "Detach", "Armor Purge"].includes(keyword)) {
    state.turnSeat = 1;
    actor.isSuspended = true;
    actor.currentDP = 1000;
    for (const permanent of opp.battleArea) permanent.isSuspended = false;
  }
  if (keyword === "Detach" && !actor.linked.length) {
    const source = actor.stack.pop();
    if (source) actor.linked.push(source);
  }
}

function promoteSource(permanent: Permanent, owner: PlayerState): void {
  const promoted = permanent.stack.pop();
  if (!promoted || !permanent.topCard) return;
  owner.trash.push(permanent.topCard);
  permanent.topCard = promoted;
  permanent.baseDP = getCardDefinition(promoted.cardId)?.dp ?? 0;
  permanent.currentDP = permanent.baseDP;
}

/** Script public zone changes for existing client cues; no card rules are executed. */
export function applyArenaVisualZoneScene({
  keyword,
  actor,
  own,
  opp,
  stage,
  portuguese,
}: ArenaVisualZoneContext): boolean {
  const opponent = opp.battleArea.find(
    (permanent) => !!getCardDefinition(permanent.topCard?.cardId ?? "")?.kinds.includes(CardKind.Digimon),
  );
  function activation(): ServerEvent {
    return {
      kind: "effectTriggered",
      seat: 0,
      sourceCardId: actor.topCard!.cardId,
      effectKey: `arena-visual-zone-${keyword}`,
      description: `${portuguese ? "Prévia visual" : "Visual preview"}: ${demoKeywordName(keyword)}`,
    };
  }
  function opponentAttack(): boolean {
    if (!opponent?.topCard || !actor.topCard) return false;
    stage(
      600,
      "Ataque adversário ao seu Digimon",
      "Opponent attacks your Digimon",
      [
        {
          kind: "attackDeclared",
          seat: 1,
          attackerPermanentId: opponent.permanentId,
          attackerCardId: opponent.topCard.cardId,
          target: { kind: "permanent", permanentId: actor.permanentId },
          targetCardId: actor.topCard.cardId,
        },
      ],
      () => {
        opponent.isSuspended = true;
      },
    );
    return true;
  }
  if (keyword === "Save" || keyword === "MaterialSave") {
    const tamer = ownTamer(own);
    const saved = keyword === "Save" ? actor.topCard : actor.stack.at(-1);
    if (!tamer || !saved || !actor.topCard || !opponentAttack()) return false;
    const departed = [actor.topCard, ...actor.stack, ...actor.linked];
    stage(
      2200,
      "Deleção pelo combate",
      "Deleted by battle",
      [
        {
          kind: "combatResolved",
          seat: 1,
          attackerPermanentId: opponent!.permanentId,
          deletedPermanentIds: [actor.permanentId],
        },
      ],
      () => {
        own.battleArea.splice(own.battleArea.indexOf(actor), 1);
        own.trash.push(...departed);
      },
    );
    stage(
      3500,
      "Carta salva sob o Tamer",
      "Card saved under the Tamer",
      [movement([saved], "trash", "stackBottom", 0)],
      () => {
        const index = own.trash.findIndex((card) => card.instanceId === saved.instanceId);
        if (index >= 0) tamer.stack.unshift(...own.trash.splice(index, 1));
      },
    );
    return true;
  }
  if (keyword === "DigiBurst") {
    const source = actor.stack.at(-1);
    if (!source) return false;
    stage(
      600,
      "Fonte paga e enviada ao trash",
      "Source paid and sent to trash",
      [activation(), movement([source], "various", "trash", 0)],
      () => {
        own.trash.push(...actor.stack.splice(actor.stack.length - 1, 1));
      },
    );
    return true;
  }
  if (keyword === "Detach") {
    const linked = actor.linked.at(-1);
    if (!linked || !opponentAttack()) return false;
    stage(
      2200,
      "Link pago para preservar o Digimon",
      "Link paid to preserve the Digimon",
      [
        { kind: "combatResolved", seat: 1, attackerPermanentId: opponent!.permanentId, deletedPermanentIds: [] },
        movement([linked], "various", "trash", 0),
      ],
      () => {
        own.trash.push(...actor.linked.splice(actor.linked.length - 1, 1));
      },
    );
    return true;
  }
  if (keyword === "Link") {
    const linked = own.hand[0];
    if (!linked) return false;
    stage(
      600,
      "Carta conectada ao Digimon",
      "Card linked to the Digimon",
      [activation(), movement([linked], "hand", "linked", 0)],
      () => {
        actor.linked.push(...own.hand.splice(0, 1));
        own.handCount = own.hand.length;
      },
    );
    return true;
  }
  if (keyword === "Mind Link") {
    const tamer = ownTamer(own);
    if (!tamer?.topCard) return false;
    const top = tamer.topCard;
    const sources = [...tamer.stack, ...tamer.linked];
    const events = [activation(), movement([top], "battleArea", "linked", 0)];
    if (sources.length) events.push(movement(sources, "various", "trash", 0));
    stage(600, "Tamer conectado ao Digimon", "Tamer linked to the Digimon", events, () => {
      own.battleArea.splice(own.battleArea.indexOf(tamer), 1);
      actor.linked.push(top);
      own.trash.push(...sources);
    });
    return true;
  }
  if (keyword === "Armor Purge" || keyword === "DeDigivolve") {
    const target = keyword === "Armor Purge" ? actor : opponent;
    if (!actor.topCard || !target?.topCard || !target.stack.length || !opponent?.topCard) return false;
    if (keyword === "Armor Purge") opponentAttack();
    else
      stage(600, "Efeito de De-Digivolve no adversário", "De-Digivolve effect on the opponent", [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: actor.topCard.cardId,
          effectKey: "arena-visual-de-digivolve",
          description: "Scripted De-Digivolve visual preview",
        },
      ]);
    const owner = keyword === "Armor Purge" ? own : opp;
    const seat = keyword === "Armor Purge" ? 0 : 1;
    const events = [movement([target.topCard], "various", "trash", seat)];
    if (keyword === "Armor Purge")
      events.unshift({
        kind: "combatResolved",
        seat: 1,
        attackerPermanentId: opponent.permanentId,
        deletedPermanentIds: [],
      });
    stage(2200, "Topo removido e fonte promovida", "Top removed and source promoted", events, () => {
      promoteSource(target, owner);
    });
    return true;
  }
  return false;
}
