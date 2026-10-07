import express from "express";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { matchMaker } from "colyseus";
import { installSpectatorRoutes } from "./spectatorRoutes.js";
import { roomCodeDirectory, setRoomCodeDirectory } from "./AegisRoom.js";

vi.mock("colyseus", async (importOriginal) => ({
  ...(await importOriginal<typeof import("colyseus")>()),
  matchMaker: { query: vi.fn(), remoteRoomCall: vi.fn(), reserveSeatFor: vi.fn() },
}));
const originalDirectory = roomCodeDirectory();
afterEach(() => {
  vi.clearAllMocks();
  setRoomCodeDirectory(originalDirectory);
});

async function request(body: unknown) {
  const app = express();
  app.use(express.json());
  installSpectatorRoutes(app);
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/spectate/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: (await response.json()) as Record<string, unknown> };
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

function available(name = "aegis") {
  setRoomCodeDirectory({ resolve: vi.fn(async () => "match-id"), claim: vi.fn(), release: vi.fn() });
  vi.mocked(matchMaker.query).mockResolvedValue([{ roomId: "match-id", name, locked: true, clients: 2 }] as never);
  vi.mocked(matchMaker.remoteRoomCall).mockResolvedValue({
    roomId: "match-id",
    players: ["A", "B"],
    spectators: 0,
  } as never);
  vi.mocked(matchMaker.reserveSeatFor).mockResolvedValue({
    sessionId: "spectator-session",
    roomId: "match-id",
  } as never);
}

describe("spectator admission", () => {
  it("requires a code, including for public matches", async () => {
    expect((await request({ roomId: "match-id" })).status).toBe(400);
    expect((await request({ roomCode: 42 })).status).toBe(400);
    expect(matchMaker.reserveSeatFor).not.toHaveBeenCalled();
  });
  for (const name of ["aegis", "aegis_beta", "aegis_private"]) {
    it(`reserves a code-authorized observer in a locked ${name} match`, async () => {
      available(name);
      const response = await request({
        roomCode: "abcdef",
        displayName: "Watcher",
        spectator: false,
        ranked: true,
        deck: { mainDeck: ["forged"] },
      });
      expect(response.status).toBe(200);
      expect(response.body.sessionId).toBe("spectator-session");
      expect(matchMaker.remoteRoomCall).toHaveBeenCalledWith("match-id", "spectatorInfo", ["ABCDEF"]);
      expect(matchMaker.reserveSeatFor).toHaveBeenCalledWith(expect.anything(), {
        spectator: true,
        roomCode: "ABCDEF",
        displayName: "Watcher",
        deck: { mainDeck: [], eggDeck: [] },
      });
    });
  }
  it("does not admit bot, ranked or tournament observers", async () => {
    for (const name of ["aegis_bot", "aegis_ranked", "aegis_tournament"]) {
      available(name);
      expect((await request({ roomCode: "ABCDEF" })).status).toBe(404);
    }
    expect(matchMaker.reserveSeatFor).not.toHaveBeenCalled();
  });
  it("rejects a wrong code, finished match, or full observer capacity", async () => {
    available();
    vi.mocked(matchMaker.remoteRoomCall).mockResolvedValue(null as never);
    expect((await request({ roomCode: "ABCDEF" })).status).toBe(404);
    expect(matchMaker.reserveSeatFor).not.toHaveBeenCalled();
  });
  it("handles a room disappearing between validation and reservation", async () => {
    available();
    vi.mocked(matchMaker.reserveSeatFor).mockRejectedValue(new Error("room disposed"));
    expect((await request({ roomCode: "ABCDEF" })).status).toBe(409);
  });
});
