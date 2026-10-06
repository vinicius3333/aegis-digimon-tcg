import type { Express } from "express";
import { matchMaker } from "colyseus";
import { ROOM_TYPE, ROOM_TYPE_BETA, ROOM_TYPE_PRIVATE } from "@aegis/shared";
import { roomCodeDirectory, type AegisRoom } from "./AegisRoom.js";

/** Code-only observer reservations; active matches remain locked to player matchmaking. */
export function installSpectatorRoutes(app: Express): void {
  app.post("/spectate/join", async (req, res) => {
    const { roomCode } = req.body ?? {};
    if (typeof roomCode !== "string" || !/^[A-Z2-9]{6}$/i.test(roomCode)) {
      res.status(400).json({ error: "A six-character roomCode is required" });
      return;
    }
    const code = roomCode.toUpperCase();
    const roomId = await roomCodeDirectory().resolve(code);
    const [listing] = roomId ? await matchMaker.query({ roomId }) : [];
    if (!listing || !new Set<string>([ROOM_TYPE, ROOM_TYPE_BETA, ROOM_TYPE_PRIVATE]).has(listing.name)) {
      res.status(404).json({ error: "Match is not available to spectators" });
      return;
    }
    try {
      const info = await matchMaker.remoteRoomCall<AegisRoom, "spectatorInfo">(listing.roomId, "spectatorInfo", [code]);
      if (!info) {
        res.status(404).json({ error: "Match is not available to spectators" });
        return;
      }
      // reserveSeatFor intentionally bypasses the matchmaking lock. onAuth and onJoin
      // still verify role, code, match lifecycle and observer capacity on the owning process.
      const reservation = await matchMaker.reserveSeatFor(listing, {
        spectator: true,
        roomCode: code,
        displayName: "Spectator",
        deck: { mainDeck: [], eggDeck: [] },
      });
      res.json(reservation);
    } catch {
      res.status(409).json({ error: "Match is no longer available; refresh and try again" });
    }
  });
}
