// Explicit operator probe. Run in the web Docker builder, on the application network.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFileSync, existsSync, renameSync } from "node:fs";

const { Client } = createRequire("/app/apps/web/package.json")("colyseus.js");
const { GameState } = await import("/app/packages/shared/dist/index.js");
const origin = process.env.AEGIS_PROOF_ORIGIN ?? "http://aegis-gateway";
const marker = process.env.AEGIS_PROOF_MARKER ?? "/proof/live-proof.json";
const finish = process.env.AEGIS_PROOF_FINISH ?? "/proof/finish-proof";
const rooms = [];
const delay = (ms) => new Promise((done) => setTimeout(done, ms));
const deck = {
  mainDeck: [
    ["BT1-009", 4],
    ["BT1-010", 4],
    ["BT1-011", 4],
    ["BT1-012", 4],
    ["BT1-013", 4],
    ["BT1-014", 4],
    ["BT1-015", 4],
    ["BT1-016", 4],
    ["BT1-020", 4],
    ["BT1-021", 4],
    ["BT1-025", 2],
    ["BT1-017", 3],
    ["BT1-085", 4],
    ["BT1-090", 1],
  ].flatMap(([id, count]) => Array(count).fill(id)),
  eggDeck: ["BT1-001", "BT1-001", "BT1-001", "BT1-002", "BT1-002"],
};
const manifest = async () => (await fetch(`${origin}/deployment/manifest.json`)).json();
const record = (stage, details = {}) => {
  writeFileSync(
    `${marker}.tmp`,
    JSON.stringify({ stage, roomIds: [...new Set(rooms.map((room) => room.roomId))], ...details }),
    { mode: 0o600 },
  );
  renameSync(`${marker}.tmp`, marker);
  console.log(`LIVE PROOF ${stage}`);
};
async function waitFor(check, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  while (!(await check())) {
    if (Date.now() > deadline) throw new Error("Live proof timed out");
    await delay(100);
  }
}
async function reserve(slot, method, name, options) {
  const response = await fetch(`${origin}/api/${slot}/matchmake/${method}/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(options),
  });
  assert.equal(response.status, 200, `Reservation ${method} rejected (${response.status})`);
  const reservation = await response.json();
  // The SDK adds this field before consuming reconnect responses; raw HTTP must do the same.
  if (method === "reconnect") reservation.reconnectionToken = options.reconnectionToken;
  assert.match(reservation.room.publicAddress, new RegExp(`/api/${slot}/p[123]$`));
  // Preserve the actual advertised owner path, substituting only the internal probe hostname.
  reservation.room.publicAddress =
    new URL(origin).host + reservation.room.publicAddress.slice(reservation.room.publicAddress.indexOf("/"));
  const room = await new Client(origin.replace(/^http/, "ws") + `/api/${slot}`).consumeSeatReservation(
    reservation,
    GameState,
  );
  room.onMessage("*", () => {});
  rooms.push(room);
  await waitFor(() => Boolean(room.state.matchLogId));
  return room;
}

try {
  assert.equal(deck.mainDeck.length, 50);
  const before = await manifest();
  const slot = before.active.slot;
  const first = await reserve(slot, "create", "aegis_private", { displayName: "Deployment probe one", deck });
  await waitFor(() => Boolean(first.state.roomCode));
  const second = await reserve(slot, "joinById", first.roomId, {
    displayName: "Deployment probe two",
    deck,
    roomCode: first.state.roomCode,
  });
  const waiting = await reserve(slot, "create", "aegis_private", { displayName: "Deployment waiting probe", deck });
  const originalMatchLog = first.state.matchLogId;
  const originalSession = first.sessionId;
  let secondDropped = false;
  second.onLeave(() => {
    secondDropped = true;
  });
  first.send("ready", {});
  second.send("ready", {});
  await waitFor(() => first.state.players[0]?.hand.length === 5);
  record("READY", { slot, revision: before.active.revision, matchLogId: originalMatchLog });
  await waitFor(async () => (await manifest()).active.slot !== slot, 1_200_000);
  const after = await manifest();
  assert.equal(secondDropped, false, "Existing player socket dropped across cutover");
  assert.equal(first.state.matchLogId, originalMatchLog);
  const blocked = await fetch(`${origin}/api/${slot}/matchmake/create/aegis_private`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ displayName: "Must not create", deck }),
  });
  assert.equal(blocked.status, 503);
  assert.equal((await blocked.json()).code, "AEGIS_DEPLOYMENT_DRAINING");
  const lookup = await fetch(`${origin}/api/${slot}/room/lookup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ roomCode: waiting.state.roomCode }),
  });
  assert.equal(lookup.status, 200);
  assert.equal((await lookup.json()).roomId, waiting.roomId);
  await reserve(slot, "joinById", waiting.roomId, {
    displayName: "Deployment waiting join",
    deck,
    roomCode: waiting.state.roomCode,
  });
  const token = first.reconnectionToken.split(":")[1];
  await first.leave(false);
  await waitFor(() => second.state.players.find((player) => player.sessionId === originalSession)?.connected === false);
  const resumed = await reserve(slot, "reconnect", first.roomId, { reconnectionToken: token });
  assert.equal(resumed.roomId, first.roomId);
  assert.equal(resumed.sessionId, originalSession);
  assert.equal(resumed.state.matchLogId, originalMatchLog);
  await waitFor(() => second.state.players.find((player) => player.sessionId === originalSession)?.connected === true);
  assert.equal(secondDropped, false);
  const fresh = await reserve(after.active.slot, "create", "aegis_private", {
    displayName: "Deployment active probe",
    deck,
  });
  await fresh.leave();
  record("VERIFIED", {
    slot,
    active: after.active,
    checks: [
      "existing-player-socket",
      "original-opponent-state-patches",
      "engine-identity",
      "draining-creation-blocked",
      "old-private-code",
      "old-private-join",
      "same-seat-reconnect",
      "new-active-room",
    ],
  });
  // Keep old rooms alive until the operator proves that cleanup refuses to stop them.
  await waitFor(() => existsSync(finish), 300_000);
} catch (error) {
  record("FAILED", { error: error.message });
  process.exitCode = 1;
} finally {
  // Colyseus leave() waits for a future event even when that connection already closed.
  await Promise.allSettled(rooms.filter((room) => room.connection?.isOpen).map((room) => room.leave()));
  if (!process.exitCode) record("DONE");
}
