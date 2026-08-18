// Revealing and searching deck, hand, trash, and security.

import type { ActionBase } from "./base.js";
import type { Controller, Filter, Target, ZoneRef } from "../filters.js";

export interface RevealAddAction extends ActionBase {
  kind: "RevealAdd";
  /** How many cards are revealed from the top. */
  revealCount: number;
  /**
   * Optional "digivolve into 1 revealed card" branch that precedes the normal add
   * dispositions. When declined (or unavailable), an add slot marked
   * `ifDigivolveDeclined` may resolve as the printed fallback (EX2-072 Blue Card).
   */
  digivolveOption?: {
    /** Filter for the revealed Digimon card used as the evolution card. */
    into: Filter;
    /** Optional restriction on the battle-area Digimon that may digivolve. */
    target?: Target;
    /** These effects currently digivolve without paying the evolution cost. */
    payCost: false;
    optional: true;
  };
  /**
   * What to do with matching revealed cards and how many. Several specs may apply
   * (e.g. "1 Digimon and 1 Tamer"). `to` is the disposition: add to hand (default),
   * trash, play without cost, or digivolve into (the "among them" play/digivolve forms).
   */
  add: {
    filter: Filter;
    /**
     * "Add 1 [X] trait or 1 Y card among them": exactly `count` cards taken from the
     * UNION of `filter` and every entry here (the player chooses which alternative).
     * A revealed card qualifies if it matches `filter` OR any `orFilters` entry — never
     * one from each (KB Q2625). Absent for the common single-criterion add.
     */
    orFilters?: Filter[];
    count: number | "all";
    /** Add to numeric `count` when a condition/scaling clause applies. */
    countModifier?: Target["countModifier"];
    to?: "hand" | "trash" | "play" | "digivolve" | "placeUnder" | "underTamer" | "security";
    /** For `to:"digivolve"`: which battle-area Digimon may receive the revealed card. */
    digivolveTarget?: Target;
    /** Place the selected revealed card at the top of security (BT6-100). */
    toTop?: boolean;
    /** The selected card is placed face down after being publicly revealed. */
    faceDown?: boolean;
    /**
     * For `to: "play"` ONLY: a play-cost REDUCTION (positive = cheaper, floored at 0 by
     * the play primitive) applied instead of a full `payCost: false` waiver ("play 1 [X]
     * among them with the cost reduced by N", BT25-074 — distinct from "without paying
     * the cost"). Absent => the existing fully-free play (`payCost: false`).
     */
    costDelta?: number;
    /**
     * Alternative dispositions for the same chosen revealed card: "add it to hand OR place it
     * as a bottom digivolution card". The card is selected once, then the controller chooses one
     * disposition from the default `to` plus these alternatives.
     */
    orDispositions?: {
      to: "hand" | "trash" | "play" | "digivolve" | "placeUnder" | "underTamer" | "security";
      underFilter?: Filter;
    }[];
    /**
     * "You may ..." among-them forms: the disposition is the player's choice, so they
     * may take fewer than `count` (down to zero) even when enough cards match. Without
     * it a numeric `count` only prompts when more cards match than are wanted, and
     * `count: "all"` takes every match — both forced, never declinable.
     */
    optional?: boolean;
    /** Compiler spelling for an explicit "up to N" disposition; equivalent to `optional`. */
    upTo?: boolean;
    /** Resolve this fallback slot only when `digivolveOption` was declined/unavailable. */
    ifDigivolveDeclined?: boolean;
    /**
     * For `to: "play"` free plays ONLY: select any number of matching revealed cards whose
     * SUMMED printed play cost is <= `costBudget`, instead of a fixed `count`. Encodes
     * "play ... whose total play costs add up to N or less" (BT11-044) and "play up to N play
     * cost's total worth of cards" (BT14-068). When set, `count` is ignored (the number of
     * cards is bounded by the budget, not a fixed quantity) and the selection is always
     * optional — the player may take fewer or zero (KB Q2085). The interpreter enforces the
     * budget server-side: a selection whose total play cost exceeds `costBudget` is rejected.
     */
    costBudget?: number;
    /**
     * When `to` is `"placeUnder"` or `"underTamer"`: filter identifying which of the controller's
     * permanents the card is placed beneath as a bottom digivolution card.
     * For `placeUnder`, absent means any of the controller's Digimon.
     * For `underTamer`, absent means any of the controller's Tamers.
     */
    underFilter?: Filter;
    /**
     * Minimum number of revealed cards matching this slot's filter required before the
     * slot is attempted. If fewer matching cards are revealed, the slot is skipped entirely.
     * Used for KB Q3114: "if only 1 applicable card is revealed, add it to hand only —
     * cannot place under a Tamer unless 2+ applicable cards are found." (BT19-055)
     */
    requiresMinRevealed?: number;
  }[];
  /** Move every revealed card matching this filter to trash before disposing of the rest. */
  trashFilter?: Filter;
  /** Where the rest go. */
  rest: "deckBottom" | "deckBottomAnyOrder" | "deckTop" | "deckTopOrBottom" | "trash";
  /**
   * Store the number of revealed cards actually added to hand under this name in
   * `EffectContext.namedCounts`, so a subsequent scaling/countSource clause can read it
   * ("... reveal 5 cards, add all [X] to hand. Gain 1 memory for each card added").
   */
  trackCount?: string;
  /** Store the number of revealed cards actually played for a following RepeatPerCount action. */
  trackPlayedCount?: string;
}

export interface RevealAction extends ActionBase {
  kind: "Reveal";
  /** Targeted reveal, e.g. "reveal 1 card in your hand" or "reveal the top card of your deck". */
  target?: Target;
  /** Shorthand for top-of-deck reveal clauses. */
  count?: number;
  /** Whose deck to reveal from when using the shorthand form. */
  controller?: Controller | "any";
  /** Shorthand source zone; currently only deck reveal is executable. */
  zone?: ZoneRef;
}

export interface SearchAction extends ActionBase {
  kind: "Search";
  controller: Controller;
  filter: Filter;
  count: number | "all";
  to?: "hand";
  /** Play the selected security cards instead of adding them to hand. */
  then?: {
    kind: "PlayWithoutCost";
    target: Target;
    payCost: false;
  };
  /** Search source zone when it is not the default deck search. */
  searchZone?: ZoneRef;
  /** Semantic purpose for searches whose results feed a following action. */
  purpose?: string;
  /** Bind the instance ids actually found/moved for a later action in this resolution. */
  bindResultAs?: string;
}

/** Search the controller's security stack and optionally play one matching card from it. */
export interface SearchSecurityAction extends ActionBase {
  kind: "SearchSecurity";
  target: Target;
  then: {
    kind: "PlayWithoutCost";
    source: "security";
    payCost: false;
    optional?: boolean;
  };
}
