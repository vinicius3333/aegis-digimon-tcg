/**
 * security-and-win-check subsystem barrel.
 *
 * On a successful player-directed attack, flip the top security card(s) and
 * resolve each (Security effect, battle the attacker, or trash). Detect loss on
 * checking empty security or drawing from an empty deck (deck-out), and end the
 * game declaring a winner. Source: documented behavior, documented behavior, documented behavior,
 * documented behavior (ISecurityCheck / IBattle / rule implementation).
 */
export { WinCheck } from "./winCheck.js";
export type { GameOverReason, LossCause } from "./winCheck.js";
export { runSecurityCheck } from "./securityCheck.js";
export type {
  SecurityCheckDeps,
  SecurityCheckAttacker,
} from "./securityCheck.js";
