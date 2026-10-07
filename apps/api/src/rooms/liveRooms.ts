/** All hosted rooms count toward deployment retirement, independent of game mode. */
export const liveRooms = new Map<string, { clients: readonly unknown[] }>();
export function liveRoomCounts(): { activeRooms: number; connectedClients: number } {
  return {
    activeRooms: liveRooms.size,
    connectedClients: [...liveRooms.values()].reduce((total, room) => total + room.clients.length, 0),
  };
}
