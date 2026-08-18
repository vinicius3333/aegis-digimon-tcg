/**
 * Colyseus channel name constants shared by client and server.
 *
 * Channels (API-CONTRACT "Channels summary"):
 *   - automatic state sync   server -> client  (GameState deltas, filtered per seat)
 *   - EVENT_CHANNEL          server -> client  (ServerEvent; actionRejected is unicast)
 *   - DECISION_CHANNEL       server -> client  (DecisionRequest; unicast to the deciding seat)
 *   - <intent.type>          client -> server  (the room registers onMessage("*"))
 */
export const EVENT_CHANNEL = "event" as const;
export const DECISION_CHANNEL = "decision" as const;

/** The Colyseus room type registered via gameServer.define(ROOM_TYPE, AegisRoom). */
export const ROOM_TYPE = "aegis" as const;

/** One-human room created directly for a match against the server bot. */
export const ROOM_TYPE_BOT = "aegis_bot" as const;

/** Public matchmaking queue whose result affects player statistics. */
export const ROOM_TYPE_RANKED = "aegis_ranked" as const;

/** Authenticated rooms bound to one server-owned tournament bracket match. */
export const ROOM_TYPE_TOURNAMENT = "aegis_tournament" as const;

/** Private room type — registered with the same class but isolated from the public matchmaker. */
export const ROOM_TYPE_PRIVATE = "aegis_private" as const;
