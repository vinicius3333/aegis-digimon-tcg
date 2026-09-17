/* How the five combat windows are answered.

   Each answer is marked locally before it is sent, so a slow round trip or a window the
   server closed without its own resolved event cannot leave a stale prompt clickable a
   second time. A fabricated connection has no room to send to and acknowledges the block
   window itself. */

import { intents } from "../../net/intents";

type Room = Parameters<typeof intents.declineBlock>[0];

export function combatAnswers({
  room,
  acknowledgeBlockWindowLocally,
  markAnswered,
}: {
  room: Room | undefined;
  acknowledgeBlockWindowLocally: ((blockerPermanentId?: string) => void) | undefined;
  markAnswered: () => void;
}) {
  return {
    onBlock: (blockerPermanentId?: string) => {
      markAnswered();
      if (room) {
        if (blockerPermanentId) intents.declareBlock(room, blockerPermanentId);
        else intents.declineBlock(room);
      } else acknowledgeBlockWindowLocally?.(blockerPermanentId);
    },
    onCounter: (instanceId?: string, effectKey?: string) => {
      markAnswered();
      if (room) intents.respondCounter(room, instanceId, effectKey);
    },
    onAlliance: (allyPermanentId?: string) => {
      markAnswered();
      if (room) intents.respondAlliance(room, allyPermanentId);
    },
    onEvade: (permanentId: string, accept: boolean) => {
      markAnswered();
      if (room) intents.respondEvade(room, permanentId, accept);
    },
    onBarrier: (permanentId: string, accept: boolean) => {
      markAnswered();
      if (room) intents.respondBarrier(room, permanentId, accept);
    },
  };
}
