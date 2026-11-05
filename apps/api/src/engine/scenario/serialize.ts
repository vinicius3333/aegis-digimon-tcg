import { validateScenarioFixture } from "./fixture.js";
import type { CardSpec, PermanentSpec, ScenarioFixture, ScenarioOpponent, SeatSpec } from "./types.js";

function fields<T extends object>(value: T, keys: readonly (keyof T)[]): T {
  return Object.fromEntries(keys.filter((key) => value[key] !== undefined).map((key) => [key, value[key]])) as T;
}
function card(value: CardSpec): CardSpec {
  if (typeof value === "string") return value;
  const result = fields(value, ["card", "as", "faceUp", "ownerSeat", "artId"]);
  if (value.fromDeck) result.fromDeck = fields(value.fromDeck, ["seat", "index", "egg"]);
  return result;
}
function permanent(value: PermanentSpec | string): PermanentSpec | string {
  if (typeof value === "string") return value;
  const result = fields(value, [
    "card",
    "as",
    "dp",
    "currentDP",
    "suspended",
    "enteredThisTurn",
    "enterFieldTurnCount",
    "inBreeding",
    "placedByEffect",
  ]);
  if (value.top) result.top = card(value.top);
  if (value.under) result.under = value.under.map(card);
  if (value.linked) result.linked = value.linked.map(card);
  return result;
}
function opponent(value: ScenarioOpponent): ScenarioOpponent {
  const result = fields(value, ["endBreeding", "fallbackMain", "blockerCard"]);
  if (value.main)
    result.main = value.main.map((action) => {
      if (action.kind === "attack") return { kind: "attack" };
      return action.kind === "play"
        ? fields(action, ["kind", "card", "useAs", "whenOpponentCard"])
        : fields(action, ["kind", "card", "base", "alternate"]);
    });
  if (value.decisions)
    result.decisions = value.decisions.map((rule) =>
      fields(rule, [
        "sourceCard",
        "kind",
        "timing",
        "promptIncludes",
        "target",
        "choice",
        "choiceStartsWith",
        "accept",
      ]),
    );
  return result;
}

/** Canonical portable preparation; arbitrary author/log metadata never enters a replay. */
export function serializeScenarioFixture(value: ScenarioFixture): ScenarioFixture {
  validateScenarioFixture(value);
  const result = fields(value, [
    "rulesPolicy",
    "name",
    "memory",
    "turnSeat",
    "turnCount",
    "isFirstPlayersFirstTurn",
    "allowOutOfRangeMemory",
  ]);
  result.board = {};
  for (const seat of [0, 1] as const) {
    const source = value.board[seat];
    if (!source) continue;
    const player: SeatSpec = source.breeding ? { breeding: permanent(source.breeding) } : {};
    for (const zone of ["hand", "deck", "eggDeck", "trash", "delayZone"] as const)
      if (source[zone]) player[zone] = source[zone].map(card);
    if (source.security !== undefined)
      player.security = typeof source.security === "number" ? source.security : source.security.map(card);
    if (source.battleArea) player.battleArea = source.battleArea.map(permanent);
    result.board[seat] = player;
  }
  if (value.effects) result.effects = value.effects.map((effect) => fields(effect, ["permanent", "kind"]));
  if (value.presentation) {
    result.presentation = fields(value.presentation, ["timed", "holdBotAfterTurn"]);
    if (value.presentation.opponent) result.presentation.opponent = opponent(value.presentation.opponent);
  }
  return structuredClone(result);
}
