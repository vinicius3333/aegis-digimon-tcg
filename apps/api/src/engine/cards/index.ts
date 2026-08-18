// card-data-model (engine side): the server's read-only access layer over the
// static card definitions in @aegis/shared. Pure functions/value objects keyed by
// card id; owns no game state. See cardData.ts for the rationale.

export * from "./cardData.js";
export { createCardSource } from "./CardSource.js";
export type { CardStateLookup } from "./CardSource.js";
