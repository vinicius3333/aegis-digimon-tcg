import { matchMaker } from "colyseus";
import type { PrivateSealedStore } from "#api/rooms/sealed/PrivateSealedStore";
import type { PrivateSealedResults } from "#api/rooms/sealed/PrivateSealedResults";
type Params = { store: PrivateSealedStore; results: PrivateSealedResults; owner: { code: string; credential: string } };
export async function reconcilePrivateSealedResult({ store, results, owner }: Params): Promise<void> {
  const current = await store.getCurrentGame(owner);
  if (!current) {
    return;
  }
  try {
    await results.flush(current.gameId);
  } catch {
    throw new Error("result_pending");
  }
  if (current.finishedAt !== null || !current.roomId || !(await matchMaker.query({ roomId: current.roomId })).length) {
    return;
  }
  try {
    const settled = await matchMaker.remoteRoomCall(current.roomId, "retryPrivateSealedResult", []);
    if (!settled) {
      throw new Error("result_pending");
    }
  } catch {
    if ((await matchMaker.query({ roomId: current.roomId })).length) {
      throw new Error("result_pending");
    }
    try {
      await results.flush(current.gameId);
    } catch {
      throw new Error("result_pending");
    }
  }
}
