import { CardKind, Phase, getCardDefinition, type GameState, type Permanent } from "@aegis/shared";

function isBattleDigimon(permanent: Permanent): boolean {
  return (
    !permanent.inBreeding &&
    (getCardDefinition(permanent.topCard?.cardId ?? "")?.kinds.includes(CardKind.Digimon) ?? false)
  );
}

/** Prepared attack affordances for this fabricated scenario; no battle is executed. */
export function prepareDemoCombat(state: GameState): void {
  const own = state.players.find((player) => player.seat === 0);
  const opponent = state.players.find((player) => player.seat === 1);
  if (!own || !opponent) return;
  const main = state.phase === Phase.Main && state.turnSeat === 0 && !state.gameOver && !state.pendingDecision;
  const targets = opponent.battleArea
    .filter((permanent) => isBattleDigimon(permanent) && permanent.isSuspended)
    .map((permanent) => permanent.permanentId);
  for (const permanent of own.battleArea) {
    permanent.canAttackPlayer = false;
    permanent.attackablePermanentIds.clear();
    if (!isBattleDigimon(permanent)) continue;
    permanent.isSuspended = false;
    permanent.summoningSick = false;
    permanent.cannotAttack = false;
    permanent.enterFieldTurnCount = Math.max(0, state.turnCount - 1);
    if (main) {
      permanent.canAttackPlayer = true;
      permanent.attackablePermanentIds.push(...targets);
    }
  }
}
