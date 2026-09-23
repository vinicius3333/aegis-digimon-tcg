import type { CardInstance, GameState, Permanent } from "@aegis/shared";

/** Check structural facts that must hold at a settled engine state. */
export function checkStateInvariants(state: GameState): string[] {
  const errors: string[] = [];
  const instances = new Map<string, string>();
  const permanents = new Map<string, string>();

  if (!Number.isInteger(state.memory) || state.memory < -10 || state.memory > 10) {
    errors.push(`memory out of bounds: ${state.memory}`);
  }

  function visitCard(card: CardInstance | undefined, location: string): void {
    if (!card?.instanceId) {
      errors.push(`missing instanceId at ${location}`);
      return;
    }
    const previous = instances.get(card.instanceId);
    if (previous) errors.push(`duplicate instanceId ${card.instanceId}: ${previous} and ${location}`);
    else instances.set(card.instanceId, location);
    if (card.ownerSeat !== 0 && card.ownerSeat !== 1) {
      errors.push(`invalid ownerSeat ${card.ownerSeat} at ${location}`);
    }
  }

  function visitPermanent(permanent: Permanent | undefined, location: string): void {
    if (!permanent) {
      errors.push(`missing permanentId at ${location}`);
      return;
    }
    if (!permanent.permanentId) errors.push(`missing permanentId at ${location}`);
    else {
      const previous = permanents.get(permanent.permanentId);
      if (previous) errors.push(`duplicate permanentId ${permanent.permanentId}: ${previous} and ${location}`);
      else permanents.set(permanent.permanentId, location);
    }
    if (permanent.controllerSeat !== 0 && permanent.controllerSeat !== 1) {
      errors.push(`invalid controllerSeat ${permanent.controllerSeat} at ${location}`);
    }
    if (permanent.currentDP < 0) errors.push(`negative currentDP ${permanent.currentDP} at ${location}`);
    visitCard(permanent.topCard, `${location}.topCard`);
    permanent.stack.forEach((card, index) => visitCard(card, `${location}.stack[${index}]`));
    permanent.linked.forEach((card, index) => visitCard(card, `${location}.linked[${index}]`));
  }

  state.players.forEach((player, index) => {
    const prefix = `players[${index}]`;
    if (player.seat !== index) errors.push(`player seat mismatch at ${prefix}: ${player.seat}`);
    for (const zone of ["deck", "eggDeck", "hand", "security", "trash", "delayZone"] as const) {
      player[zone].forEach((card, cardIndex) => visitCard(card, `${prefix}.${zone}[${cardIndex}]`));
    }
    if (player.resolvingOption) visitCard(player.resolvingOption, `${prefix}.resolvingOption`);
    player.battleArea.forEach((permanent, permanentIndex) =>
      visitPermanent(permanent, `${prefix}.battleArea[${permanentIndex}]`),
    );
    if (player.breeding) visitPermanent(player.breeding, `${prefix}.breeding`);
  });

  return errors;
}
