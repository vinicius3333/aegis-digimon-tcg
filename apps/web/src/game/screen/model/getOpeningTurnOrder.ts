import type { GameState } from "@aegis/shared/schema/GameState";
import type { Seat } from "@aegis/shared/schema/enums";
import type { TurnOrder } from "@/game/overlay/types";

type Params = {
  state: Pick<GameState, "turnCount" | "turnSeat">;
  viewerSeat: Seat;
};

export function getOpeningTurnOrder({ state, viewerSeat }: Params): TurnOrder | undefined {
  if (state.turnCount !== 0) return undefined;
  return state.turnSeat === viewerSeat ? "first" : "second";
}
