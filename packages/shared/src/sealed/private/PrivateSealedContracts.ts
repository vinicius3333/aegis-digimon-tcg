import type { SealedOwnPool, SealedDeckInput } from "#shared/sealed/SealedContracts";
import type { PrivateSealedStatus } from "#shared/sealed/private/PrivateSealedStatus";
export type PrivateSealedReady = SealedDeckInput & { window: string };
export type PrivateSealedRoomSlot = "legacy" | "blue" | "red" | "green" | `g-${string}`;
export type PrivateSealedGameTicket = { gameId: string; roomId: string; token: string; slot?: PrivateSealedRoomSlot };
export type PrivateSealedView = {
  code: string;
  seat: 0 | 1;
  players: string[];
  status: PrivateSealedStatus;
  score: [number, number];
  winner: 0 | 1 | null;
  reason: string | null;
  gameNumber: number;
  pool: SealedOwnPool;
  serverNow: number;
};
