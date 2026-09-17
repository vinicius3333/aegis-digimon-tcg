import type { DropTarget } from "../dragIntents";
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
