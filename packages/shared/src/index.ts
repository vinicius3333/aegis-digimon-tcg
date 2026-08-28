// @aegis/shared - the contract layer shared by @aegis/api and @aegis/web.
// Types, card data, the Colyseus state schema, and the wire protocol all live
// here so the server and client are compile-time forced to agree.

export * from "./schema/index.js";
export * from "./cards/index.js";
export * from "./protocol/index.js";
export * from "./effects/index.js";
export * from "./banlist.js";
export * from "./tournaments/index.js";
export * from "./decks/index.js";
export * from "./account/avatars.js";
