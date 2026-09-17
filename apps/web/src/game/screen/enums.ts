// GameScreen's own enums. String-valued so drag state stays readable in logs
// and dev tools, matching the house style (see packages/shared/src/schema/enums.ts).

/** What a held card is being dragged to do. */
export enum DragKind {
  Play = "play",
  Attack = "attack",
}
