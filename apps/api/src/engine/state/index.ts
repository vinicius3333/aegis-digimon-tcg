// game-state-schema (engine side): server-authoritative helpers over the shared
// Colyseus state tree (@aegis/shared schema). The schema classes themselves live in
// @aegis/shared so client and server share one contract; this folder holds the
// server-only logic that reads/mutates that state and the per-viewer visibility
// filtering. See visibility.ts for the StateView policy and access.ts for the
// zone/permanent read & mutation helpers.

export {
  GameStateAccess,
  installVisibilityPort,
  isHiddenZone,
  isOwnerPrivateZone,
  isPermanentZone,
} from "./access.js";
export type { VisibilityPort, VisibilityZone, CardZone } from "./access.js";
export {
  buildStateView,
  refreshStateView,
  syncPublicCounts,
  revealSecurityCardToOpponent,
  privateZoneSnapshot,
  exposeCardInZone,
} from "./visibility.js";
