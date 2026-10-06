import { resolveBattleLanes, useBattleLanePreference, type BattleLanes } from "../../../design/battleLanes";
import { useMediaQuery } from "../../../design/useMediaQuery";
import { SINGLE_LANE_PHONE_QUERY } from "../queries";

export function useBattleLanes(): BattleLanes {
  return resolveBattleLanes(useBattleLanePreference(), useMediaQuery(SINGLE_LANE_PHONE_QUERY));
}
