// `CardEffect` (one trigger window) and the per-card compiled record.

import type { Action } from "./actions/action.js";
import type { KeywordRef } from "./keywords.js";
import type { Condition } from "./predicates/conditions.js";
import type { DigivolutionRequirement } from "./requirements/digivolve.js";
import type { AppFusionRequirement, AssemblyRequirement, DnaDigivolveRequirement } from "./requirements/fusion.js";
import type { DigiXrosRequirement, LinkRequirement, MindLinkRequirement } from "./requirements/xrosLink.js";
import type { EffectFrequency, EffectTrigger } from "./triggers.js";

/**
 * One trigger window's worth of behavior: a trigger plus an ordered list of actions — the prose
 * clauses, including any `Then, ...` sequencing, flattened in order. A card compiles to
 * `CardEffect[]`.
 */
export interface CardEffect {
  trigger: EffectTrigger;
  /** Exact printed clause, for decision and log provenance. Falls back to a structural summary. */
  description?: string;
  /** From the inheritedEffectText field (ESS). */
  isInherited?: boolean;
  /** From a printed link effect; active only while this card is linked to a Digimon. */
  isLinked?: boolean;
  /** From the securityEffectText field. */
  isSecurity?: boolean;
  /**
   * Deferral window for a [Security] effect whose text delays resolution ("At the end of the
   * battle, ...", EX8-035). The executable action still carries the concrete deferred event;
   * this annotation preserves the printed timing for catalog, UI, and audit provenance.
   */
  timing?: "endOfBattle";
  /**
   * A `{Breeding}` effect: it triggers only while its card is in the breeding area. Combined with
   * a timing trigger, the timing's turn-owner gate still applies but the "still-relevant" guard
   * becomes "in breeding" instead of "on the battle area" — so BT22-007's
   * {Breeding}[Start of Your Main Phase] fires in breeding and a battle-area copy does not
   * (KB BT22-007 Q4855).
   */
  isBreeding?: boolean;
  /** A `[Trash]` tag alongside a timing trigger: it activates only from the trash. */
  isFromTrash?: boolean;
  /** A `[Hand]` tag alongside a timing trigger: it activates only from the hand. */
  isFromHand?: boolean;
  /** Attack-event subject scope for observer effects such as Tamers watching an ally attack. */
  attackScope?: "self" | "ally" | "opponent";
  frequency?: EffectFrequency;
  /**
   * Turn-owner gate for triggers that do not encode the turn direction. BT19-095's
   * `whenTrashedFromBattleArea` effects use it to split two variants that share a trigger but
   * differ by turn (KB Q3170). Evaluated in `runEffect` against the current turn seat.
   */
  turnCondition?: "yourTurn" | "opponentsTurn";
  /**
   * Shared once-per-turn key: the per-turn use ledger keys on `${cardId}/${sharedUseKey}` instead
   * of the default `ir-<timing>-<index>`, so clauses across DIFFERENT timings count against a
   * single per-turn limit on the same physical card.
   */
  sharedUseKey?: string;
  /** Whole-effect "You may". */
  optional?: boolean;
  /** Whole-effect gate — a leading "If ..." / "While ...". */
  condition?: Condition;
  /** Keyword abilities declared at this window, e.g. ＜Blocker＞ before the prose. */
  keywords?: KeywordRef[];
  actions: Action[];
}

/** Coverage classification of one card's parse. */
export type Coverage = "full" | "partial" | "none";

/** The compiled record for one card, as stored in effects.json keyed by cardId. */
export interface CompiledCard {
  effects: CardEffect[];
  coverage: Coverage;
  /** Prose fragments the parser could not fully model. */
  residual: string[];
  /**
   * Digivolve and alternate-evolution prerequisites from the cost header(s). Absent for cards
   * with no such section (Lv.2/3 base Digimon, Tamers, Options); several entries when the card
   * lists several paths.
   */
  digivolutionRequirement?: DigivolutionRequirement[];
  dnaDigivolveRequirement?: DnaDigivolveRequirement[];
  appFusionRequirement?: AppFusionRequirement[];
  /** What the card may be linked to, and at what cost. */
  linkRequirement?: LinkRequirement[];
  digiXrosRequirement?: DigiXrosRequirement[];
  assemblyRequirement?: AssemblyRequirement[];
  /** Structural capture only; the pairing behavior is not yet executed. */
  mindLinkRequirement?: MindLinkRequirement[];
}

/** The whole effects.json shape: cardId -> compiled record. */
export type CompiledEffects = Record<string, CompiledCard>;
