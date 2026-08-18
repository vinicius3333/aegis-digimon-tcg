import type { AttackTarget, DecisionResponse, DigiXrosPlan } from "@aegis/shared";
import { sendIntent, type AegisRoom } from "./client";

/**
 * Typed wrappers around the intent protocol (ARCHITECTURE.md section 2,
 * net/intents.ts). UI handlers call these instead of sending raw messages, so a
 * protocol change is a compile error here.
 */
export const intents = {
  ready: (room: AegisRoom) => sendIntent(room, { type: "ready" }),
  mulligan: (room: AegisRoom, keep: boolean) => sendIntent(room, { type: "mulligan", keep }),

  playCard: (room: AegisRoom, instanceId: string, targetSlot?: number, digiXros?: DigiXrosPlan) =>
    sendIntent(room, { type: "playCard", instanceId, targetSlot, digiXros }),
  digivolve: (room: AegisRoom, permanentId: string, instanceId: string, useAlternateCost?: boolean) =>
    sendIntent(room, { type: "digivolve", permanentId, instanceId, useAlternateCost }),
  dnaDigivolve: (room: AegisRoom, materialPermanentIds: string[], instanceId: string) =>
    sendIntent(room, { type: "dnaDigivolve", materialPermanentIds, instanceId }),
  hatchEgg: (room: AegisRoom) => sendIntent(room, { type: "hatchEgg" }),
  moveFromBreeding: (room: AegisRoom, permanentId: string) =>
    sendIntent(room, { type: "moveFromBreeding", permanentId }),
  activateEffect: (room: AegisRoom, sourceInstanceId: string, effectKey: string) =>
    sendIntent(room, { type: "activateEffect", sourceInstanceId, effectKey }),
  endPhase: (room: AegisRoom) => sendIntent(room, { type: "endPhase" }),

  attack: (room: AegisRoom, attackerPermanentId: string, target: AttackTarget, vortex?: boolean) =>
    sendIntent(room, { type: "attack", attackerPermanentId, target, vortex }),
  declareBlock: (room: AegisRoom, blockerPermanentId: string) =>
    sendIntent(room, { type: "declareBlock", blockerPermanentId }),
  declineBlock: (room: AegisRoom) => sendIntent(room, { type: "declineBlock" }),

  respondCounter: (room: AegisRoom, sourceInstanceId?: string, effectKey?: string) =>
    sendIntent(room, { type: "respondCounter", sourceInstanceId, effectKey }),

  respondAlliance: (room: AegisRoom, allyPermanentId?: string) =>
    sendIntent(room, { type: "respondAlliance", allyPermanentId }),
  respondEvade: (room: AegisRoom, permanentId: string, accept: boolean) =>
    sendIntent(room, { type: "respondEvade", permanentId, accept }),
  respondBarrier: (room: AegisRoom, permanentId: string, accept: boolean) =>
    sendIntent(room, { type: "respondBarrier", permanentId, accept }),

  respondDecision: (room: AegisRoom, decisionId: string, response: DecisionResponse) =>
    sendIntent(room, { type: "respondDecision", decisionId, response }),

  surrender: (room: AegisRoom) => sendIntent(room, { type: "surrender" }),
} as const;
