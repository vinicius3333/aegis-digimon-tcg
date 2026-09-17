/**
 * The pane that takes the play surfaces' pointer input away while a security check owns
 * the screen. It draws nothing and says nothing: it exists so a click on a card, a stack
 * or the turn control during the check cannot become an action on a board the other
 * player is still watching resolve. The board's own capture-phase listener sits above it,
 * so clicking through the scene still fast-forwards whatever part of it is skippable.
 */
export function BoardInputLock() {
  return <div className="game-input-lock" data-testid="board-input-lock" aria-hidden="true" />;
}
