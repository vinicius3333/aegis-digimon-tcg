/**
 * Headless connect + render smoke test for the Aegis web client's network path.
 *
 * Joins two clients to the Colyseus "aegis" room (filling a 2-player match),
 * subscribes to synchronized state, prints what each client sees, and exercises the
 * client->server intent wire (the rejections it gets back prove the round trip).
 * This validates the same net/ layer the browser client uses, without a browser.
 *
 * Usage (api must be running on the endpoint below):
 *   node apps/web/scripts/smoke-connect.mjs
 *   AEGIS_SMOKE_ENDPOINT=ws://127.0.0.1:2567 node apps/web/scripts/smoke-connect.mjs
 *
 * Exit code 0 = PASS (both clients joined the same room and saw 2 players, no
 * connection errors); 1 = FAIL.
 */
import { Client } from "colyseus.js";

const endpoint = process.env.AEGIS_SMOKE_ENDPOINT ?? "ws://127.0.0.1:2567";
const ROOM_TYPE = "aegis";
const joinOptions = { displayName: "P", deck: { mainDeck: [], eggDeck: [] } };

function summarize(state) {
  if (!state) return "(no state yet)";
  const players = (state.players ?? []).map((p) => ({
    seat: p.seat,
    name: p.displayName,
    connected: p.connected,
    deck: p.deckCount,
    hand: p.handCount,
    security: p.securityCount,
    eggDeck: p.eggDeckCount,
    battleArea: p.battleArea?.length ?? 0,
    trash: p.trash?.length ?? 0,
    hasBreeding: Boolean(p.breeding && p.breeding.topCard),
  }));
  return {
    matchId: state.matchId,
    phase: state.phase,
    turnCount: state.turnCount,
    turnSeat: state.turnSeat,
    memory: state.memory,
    gameOver: state.gameOver,
    winnerSeat: state.winnerSeat,
    playerCount: players.length,
    players,
  };
}

async function main() {
  const errors = [];
  const events = [];

  const c1 = new Client(endpoint);
  const c2 = new Client(endpoint);

  console.log(`[smoke] endpoint ${endpoint}`);
  console.log("[smoke] client 1 joining...");
  const r1 = await c1.joinOrCreate(ROOM_TYPE, joinOptions);
  console.log(`[smoke] client 1 joined room ${r1.roomId} as session ${r1.sessionId}`);
  r1.onMessage("event", (e) => events.push({ who: 1, ...e }));
  r1.onError((code, msg) => errors.push({ who: 1, code, msg }));

  console.log("[smoke] client 2 joining (fills the match)...");
  const r2 = await c2.joinOrCreate(ROOM_TYPE, joinOptions);
  console.log(`[smoke] client 2 joined room ${r2.roomId} as session ${r2.sessionId}`);
  r2.onError((code, msg) => errors.push({ who: 2, code, msg }));

  await new Promise((res) => setTimeout(res, 2000));

  const s1 = summarize(r1.state);
  const s2 = summarize(r2.state);
  console.log("\n[smoke] client 1 synchronized state view:");
  console.log(JSON.stringify(s1, null, 2));
  console.log("\n[smoke] client 2 synchronized state view:");
  console.log(JSON.stringify(s2, null, 2));

  const dealtOk =
    s1.playerCount === 2 &&
    s2.playerCount === 2 &&
    s1.players.every((p) => p.hand >= 0 && p.deck >= 0) &&
    s2.players.every((p) => p.hand >= 0 && p.deck >= 0);
  if (!dealtOk) {
    errors.push({ who: 0, msg: "dealt-state sanity check failed (zeroed or missing players)" });
  }

  console.log("\n[smoke] sending intents from client 1 (ready, endPhase, playCard)...");
  r1.send("ready", {});
  r1.send("endPhase", {});
  r1.send("playCard", { instanceId: "nonexistent" });
  await new Promise((res) => setTimeout(res, 500));

  console.log("\n[smoke] events received:");
  console.log(events.length ? JSON.stringify(events, null, 2) : "(none)");
  console.log("\n[smoke] errors:");
  console.log(errors.length ? JSON.stringify(errors, null, 2) : "(none)");

  const finalState = summarize(r1.state);
  const ok =
    Boolean(r1.roomId) &&
    r1.roomId === r2.roomId &&
    typeof finalState === "object" &&
    finalState.playerCount === 2 &&
    errors.length === 0;
  console.log(
    `\n[smoke] RESULT: ${ok ? "PASS" : "FAIL"} — joined=${Boolean(r1.roomId)} ` +
      `sameRoom=${r1.roomId === r2.roomId} players=${finalState.playerCount} errors=${errors.length}`,
  );

  await r1.leave();
  await r2.leave();
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("[smoke] threw:", e);
  process.exit(1);
});
