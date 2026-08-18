// `CardEffect` (one trigger window) and the per-card compiled record.

import type { Action } from "./actions/index.js";
import type { KeywordRef } from "./keywords.js";
import type { Condition } from "./predicates.js";
import type {
  AppFusionRequirement,
  AssemblyRequirement,
  DigiXrosRequirement,
  DigivolutionRequirement,
  DnaDigivolveRequirement,
  LinkRequirement,
  MindLinkRequirement,
} from "./requirements.js";
import type { EffectFrequency, EffectTrigger } from "./triggers.js";

/**
 * One trigger window's worth of behavior: a trigger (+ optional modifiers) and
 * an ordered list of actions (the prose clauses, including any `Then, ...`
 * sequencing, flattened in order). A card compiles to `CardEffect[]`.
 */
export interface CardEffect {
  trigger: EffectTrigger;
  /** Exact printed clause for decision/log provenance; falls back to a structural summary. */
  description?: string;
  /** True when this effect comes from the inheritedEffectText field (ESS). */
  isInherited?: boolean;
  /** True when this effect comes from the securityEffectText field. */
  isSecurity?: boolean;
  /**
   * Deferral window for a [Security] effect whose printed text delays resolution ("At the
   * end of the battle, ...", EX8-035). NOT YET CONSUMED by the interpreter — such effects
   * currently resolve at security-check time; the annotation preserves the printed intent
   * until the deferred-security capability lands.
   */
  timing?: "endOfBattle";
  /**
   * True when this is a `{Breeding}` effect — it triggers/activates ONLY while its card is in the
   * breeding (raising) area. Combined with a timing
   * trigger (e.g. StartOfYourMainPhase), the timing's turn-owner gate still applies, but the
   * base "still-relevant" guard becomes "in breeding" instead of "on the battle area" — so a
   * breeding-resident timed effect (BT22-007 {Breeding}[Start of Your Main Phase]) fires while in
   * breeding, and a battle-area copy does NOT (KB BT22-007 Q4855).
   */
  isBreeding?: boolean;
  /**
   * True when a `[Trash]` tag appears alongside a timing trigger in the same block. The effect
   * activates only when this card is in the trash.
   */
  isFromTrash?: boolean;
  /**
   * True when a `[Hand]` tag appears alongside a timing trigger in the same block. The effect
   * activates only when this card is in the hand.
   */
  isFromHand?: boolean;
  frequency?: EffectFrequency;
  /**
   * Optional turn-owner gate for effects whose trigger does not encode the turn direction
   * ("yourTurn" / "opponentsTurn"). Used by `whenTrashedFromBattleArea` effects on BT19-095
   * to split the two variants (same trigger, different turn; KB Q3170). The interpreter
   * evaluates this in `runEffect` against the current turn seat.
   */
  turnCondition?: "yourTurn" | "opponentsTurn";
  /**
   * Optional shared once-per-turn key. When set, this effect's per-turn use ledger is keyed on
   * `${cardId}/${sharedUseKey}` instead of the default `ir-<timing>-<index>` — so several clauses
   * across DIFFERENT timings (e.g. an On Play / When Digivolving / When Attacking that "[Once Per
   * all count against a single per-turn limit on the same physical card instance.
   */
  sharedUseKey?: string;
  /** Whole-effect "You may". */
  optional?: boolean;
  /** Whole-effect gate ("If ..." / "While ..." leading the clause). */
  condition?: Condition;
  /** Keyword abilities declared at this window (e.g. ＜Blocker＞ before the prose). */
  keywords?: KeywordRef[];
  /** The ordered actions. */
  actions: Action[];
}

/** Coverage classification of one card's parse. */
export type Coverage = "full" | "partial" | "none";

/** The compiled record for one card, as stored in effects.json (keyed by cardId). */
export interface CompiledCard {
  effects: CardEffect[];
  coverage: Coverage;
  /** Residual prose fragments the parser could not fully model. */
  residual: string[];
  /**
   * Digivolve / alternate-evolution prerequisites parsed from the cost header(s).
   * Absent when the card has no digivolve requirement section (Lv.2/3 base Digimon,
   * Tamers, Options). Multiple entries when the card lists multiple paths.
   */
  digivolutionRequirement?: DigivolutionRequirement[];
  /**
   * DNA-digivolve (Jogress) prerequisites parsed from a "DNA Digivolution: ..." header.
   * Absent when the card has no DNA-digivolve section.
   */
  dnaDigivolveRequirement?: DnaDigivolveRequirement[];
  /**
   * App Fusion prerequisites parsed from an "[App Fusion] [A] & [B]: Cost N" header.
   * Absent when the card has no App-Fusion section.
   */
  appFusionRequirement?: AppFusionRequirement[];
  /**
   * Link prerequisites parsed from the card's link header (what it may be linked to and
   * at what cost). Absent when the card has no link condition.
   */
  linkRequirement?: LinkRequirement[];
  /**
   * DigiXros prerequisites parsed from a "[DigiXros -N] ..." header. Absent when the card
   * has no DigiXros section.
   */
  digiXrosRequirement?: DigiXrosRequirement[];
  /**
   * Assembly prerequisites parsed from an "[Assembly] ..." header. Absent when the card has
   * no Assembly section.
   */
  assemblyRequirement?: AssemblyRequirement[];
  /**
   * Mind Link records parsed from a ＜Mind Link＞ ability. Absent when the card has no Mind
   * Link. Structural capture only (the pairing behavior is not yet executed).
   */
  mindLinkRequirement?: MindLinkRequirement[];
}

/** The whole effects.json shape: cardId -> compiled record. */
export type CompiledEffects = Record<string, CompiledCard>;
