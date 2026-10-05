import { getCardDefinition, Phase, type GameState } from "@aegis/shared";
import type { SoundDetails, SoundKind } from "../../../design/sound";
import type { MatchCues } from "../types";
import { SecurityBreakPhase } from "../enums";
import { SECURITY_CLASH_OUTCOME_AT_MS, SECURITY_DESTROY_OUTCOME_AT_MS } from "../../securityClash";

export interface PresentationSound {
  id: string;
  kind: SoundKind;
  details?: SoundDetails;
}

/** Only committed visible presentations earn audio; receipt/intent timing has no role. */
export function soundsForPresentation(cues: MatchCues, state?: GameState): PresentationSound[] {
  const sounds: PresentationSound[] = [];
  const add = (id: string, kind: SoundKind, details?: SoundDetails) =>
    sounds.push({ id, kind, ...(details ? { details } : {}) });
  const cardDetails = (cardId: string): SoundDetails => {
    const card = getCardDefinition(cardId);
    return {
      cost: card?.playCost,
      targetLevel: card?.level,
      assembly: /[＜<]Assembly\b/i.test(card?.effectText ?? ""),
    };
  };
  const evolutionDetails = (cardId: string, permanentId?: string): SoundDetails => {
    const details = cardDetails(cardId);
    const permanent = state?.players
      .flatMap((player) => [...player.battleArea, ...(player.breeding ? [player.breeding] : [])])
      .find(
        (item) =>
          item.permanentId === permanentId ||
          item.topCard?.cardId === cardId ||
          item.stack.some((card) => card.cardId === cardId),
      );
    // Only public physical stack data determines the source level. Missing data uses the neutral recipe.
    const stack = permanent ? [...permanent.stack, ...(permanent.topCard ? [permanent.topCard] : [])] : [];
    const targetIndex = stack.map((card) => card.cardId).lastIndexOf(cardId);
    const source = targetIndex > 0 ? stack[targetIndex - 1] : undefined;
    return { ...details, sourceLevel: source ? getCardDefinition(source.cardId)?.level : undefined };
  };
  if (cues.zoneShowcase) {
    const scene = cues.zoneShowcase;
    add(
      `arrival:${scene.key}`,
      scene.kind === "play" ? "cardPlay" : "digivolve",
      scene.kind === "play" ? cardDetails(scene.cardId) : evolutionDetails(scene.cardId),
    );
  }
  for (const burst of cues.permanentBursts.values()) {
    if (burst.moveFromBreeding) add(`move:${burst.key}`, "move");
    else if (burst.variant === "hatch") add(`hatch:${burst.key}`, "hatch");
    else if (burst.variant === "play" || burst.variant === "evolve") {
      const permanent = state?.players
        .flatMap((player) => [...player.battleArea, ...(player.breeding ? [player.breeding] : [])])
        .find((item) => item.permanentId === burst.permanentId);
      const cardId = permanent?.topCard?.cardId ?? "";
      // Showcase and landing share occurrence keys; the landing is a fallback, never a second play.
      add(
        `arrival:${burst.key}`,
        burst.variant === "play" ? "cardPlay" : "digivolve",
        burst.variant === "play" ? cardDetails(cardId) : evolutionDetails(cardId, burst.permanentId),
      );
    }
  }
  if (cues.attackAnnouncement) add(`attack:${cues.attackAnnouncement.id}`, "attackDeclare");
  if (cues.securityBreak?.phase === SecurityBreakPhase.Break) add(`shield:${cues.securityBreak.key}`, "securityHit");
  if (cues.securityClash && !cues.securityClash.revealedReady)
    add(`security-reveal:${cues.securityClash.key}`, "reveal");
  for (const id of cues.combatImpactIds)
    add(`impact:${cues.fieldClash?.key ?? cues.securityClash?.key ?? id}`, "impact");
  for (const burst of cues.deleteBursts) {
    const topStrip = burst.stackStripKind === "top";
    add(`departure:${burst.key}`, burst.stackStrip ? (topStrip ? "deDigivolve" : "sourceTrash") : "delete");
  }
  for (const source of cues.effectSources) {
    // Field focus owns its geometry-validated cue in EffectFocus. Linked holds are silent.
    if (source.site.zone !== "field" && source.linked !== true) add(`source:${source.key}`, "effectActivate");
  }
  for (const [pile, key] of cues.deckRiffles) add(`shuffle:${pile}:${key}`, "shuffle");
  for (const [key] of cues.securityFlights) add(`recovery:${key}`, "recover");
  for (const flight of cues.drawFlights)
    add(`flight:${flight.key}`, flight.deckReturn || flight.handReturn ? "move" : "draw");
  if (cues.revealShowcase) add(`reveal:${cues.revealShowcase.key}`, "reveal");
  for (const pulse of cues.dpPulses.values()) add(`dp:${pulse.key}`, pulse.kind === "buff" ? "buff" : "debuff");
  for (const pulse of cues.freezePulses.values()) add(`freeze:${pulse.key}`, "freeze");
  if (cues.unsuspendSweep) add(`unsuspend:${cues.unsuspendSweep.key}`, "move");
  if (cues.phaseBanner?.phase === Phase.End) add(`end:${cues.phaseBanner.key}`, "endTurn");
  for (const notice of cues.notices) {
    const body = notice.body;
    if (body.variant === "effect") {
      // A physical source focus already explains this activation. Unlocated sources still have the painted clause.
      if (!cues.effectSources.some((source) => source.itemId === notice.id || source.cardId === body.cardId))
        add(`notice:${notice.id}`, "effectActivate");
    } else if (notice.body.variant === "keyword") add(`notice:${notice.id}`, "group");
  }
  for (const panel of cues.sidePanels) {
    if (panel.titleKey === "panel.discardedCards") add(`panel:${panel.id}`, "handTrash");
    else if (panel.titleKey === "panel.trashedCards") add(`panel:${panel.id}`, "handTrash");
    else if (panel.titleKey === "panel.digivolutionCards" || panel.titleKey === "panel.selectedCards")
      add(`panel:${panel.id}`, "group");
  }
  return sounds;
}

/** Bound memory, preserving a played occurrence across linked holds and geometry updates. */
export function takeNewPresentationSounds(
  sounds: readonly PresentationSound[],
  seen: Set<string>,
): PresentationSound[] {
  const fresh = sounds.filter((sound) => {
    if (seen.has(sound.id)) return false;
    seen.add(sound.id);
    return true;
  });
  while (seen.size > 512) seen.delete(seen.values().next().value!);
  return fresh;
}

/** CSS-owned security outcomes have a public scene clock, so they need no polling. */
export function securityOutcomeSound(
  scene: MatchCues["securityClash"],
): (PresentationSound & { delayMs: number }) | null {
  if (!scene || (scene.cause !== "destruction" && scene.resolution !== "battle")) return null;
  return {
    id: `security-outcome:${scene.key}`,
    kind: scene.cause === "destruction" ? "delete" : "impact",
    delayMs:
      scene.outcomeAtMs ??
      (scene.cause === "destruction" ? SECURITY_DESTROY_OUTCOME_AT_MS : SECURITY_CLASH_OUTCOME_AT_MS),
  };
}
