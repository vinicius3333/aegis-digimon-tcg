// Declarative intermediate representation (IR) for card effect text.
//
// The compiler pipeline is: effect text (English prose) -> this IR -> the
// runtime interpreter (apps/api/src/engine/effects/interpreter.ts) which
// dispatches each Action to the existing effect primitives.
//
// The IR is deliberately a closed, serializable, discriminated-union model so
// that `runtime effect records` can emit it as JSON (effects.json) and the
// server can load and interpret it without re-parsing prose at runtime. Every
// union is discriminated on a string literal field so both the parser (plain
// JS) and the interpreter (TS) agree on the shape by structure alone.
//
// Scope (v1): breadth over depth. The high-frequency triggers, keywords, and
// clause verbs from the 4,201-card corpus are modeled with typed params; the
// long tail is captured verbatim as `RawUnparsed` so nothing is silently lost
// and coverage is measurable.
//
// The model is split by domain across this directory. Nothing here emits
// runtime code, so the import graph between these modules may contain cycles
// (an action node referencing the `Action` union, for example).

export type * from "./actions/index.js";
export type * from "./card.js";
export type * from "./durations.js";
export type * from "./filters.js";
export type * from "./keywords.js";
export type * from "./predicates.js";
export type * from "./requirements.js";
export type * from "./triggers.js";
