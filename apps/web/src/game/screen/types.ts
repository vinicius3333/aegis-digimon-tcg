import type { RefObject } from "react";
import type { Permanent, PlayerState } from "@aegis/shared";
import type { DropTarget } from "../dragIntents";
import type { DpPulse } from "../dpPulse";
import type { FreezePulse } from "../freezePulse";
import type { PendingFateBadge } from "../pendingFate";
import type { PermanentBurst } from "../showcases";
import type { AttackLunge } from "../match/types";
import type { TrackingArrow } from "../trackingArrow";
import { DragKind } from "./enums";

/** A solved target arrow: the ids resolved to real positions in board coordinates. */
export interface TrackingArrowGeometry {
  key: string;
  kind: TrackingArrow["kind"];
  from: { x: number; y: number };
  to: { x: number; y: number }[];
}

/**
 * `deferred` marks a touch gesture whose direction is not yet known: the pointer is
 * left to the browser until `move` decides between a sideways swipe (scroll the row)
 * and a drag (play / attack). `capture` is the element to capture onto once it does.
 */
export type DragOrigin = { deferred?: boolean; capture?: Element };

/** A drop area under the pointer: the `data-drop` name it carries, and the id it names. */
export type DropZoneHit = { target: DropTarget; id?: string };

export type DragState =
  | ({
      kind: DragKind.Play;
      index: number;
      instanceId: string;
      cardId: string;
      artId?: string;
      x: number;
      y: number;
      ox: number;
      oy: number;
      started: boolean;
    } & DragOrigin)
  | ({
      kind: DragKind.Attack;
      permanentId: string;
      cardId: string;
      artId?: string;
      x: number;
      y: number;
      ox: number;
      oy: number;
      started: boolean;
    } & DragOrigin);

/**
 * A seat as the board shows it. The presentation hands the screen either the live
 * `PlayerState` or a plain object built from one, so the shared shape is the data both
 * carry and never the schema class itself.
 */
export type PresentedPlayer = {
  /** A held phase replays rotation over a plain array, so this is never the schema list. */
  battleArea: readonly Permanent[];
} & Pick<
  PlayerState,
  | "displayName"
  | "breeding"
  | "hand"
  | "handCount"
  | "deckCount"
  | "eggDeckCount"
  | "trash"
  | "security"
  | "securityCount"
  | "securityDpDelta"
>;

/**
 * Everything both battle rows put on a permanent that comes from the cue hook rather
 * than from the permanent itself. Gathered once, so each row's own props are only what
 * makes that side of the board different.
 */
export interface PermanentChrome {
  /** Canonical keyword names mapped to printed parameters, in the visual demo only. */
  keywordLabels?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  compact: boolean;
  width: number;
  permanentRefs: RefObject<Record<string, HTMLDivElement | null>>;
  effectSourcePermanentIds: ReadonlySet<string>;
  decisionHighlightPermanentId?: string;
  permanentBursts: ReadonlyMap<string, PermanentBurst>;
  pendingPermanentIds: ReadonlySet<string>;
  fateBadges: ReadonlyMap<string, PendingFateBadge>;
  combatImpactIds: ReadonlySet<string>;
  dpPulses: ReadonlyMap<string, DpPulse>;
  freezePulses: ReadonlyMap<string, FreezePulse>;
  attackLunge: AttackLunge | null;
  heldSuspendedIds: ReadonlySet<string>;
  /** The sweep's stagger for the permanent at this position in its owner's row. */
  suspendDelayMs: (index: number) => number;
}
