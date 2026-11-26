import { matchMaker } from "colyseus";
import { MATCH_EXPIRED_CLOSE_CODE } from "@aegis/shared/protocol/closeCodes";
type Params = { roomId: string };
export async function closePrivateSealedRoom({ roomId }: Params): Promise<void> {
  if (!(await matchMaker.query({ roomId })).length) {
    return;
  }
  try {
    await matchMaker.remoteRoomCall(roomId, "disconnect", [MATCH_EXPIRED_CLOSE_CODE]);
  } catch (error) {
    if ((await matchMaker.query({ roomId })).length) {
      throw error;
    }
  }
}
