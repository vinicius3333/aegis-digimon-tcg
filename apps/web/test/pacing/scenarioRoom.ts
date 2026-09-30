/* The real AegisRoom, hosted in-process with no transport, under the test's fake clock.

   Everything the room decides is the shipping code: the engine, the dev scenario, the bot
   seat with its own think delays, the batch envelope, the per-seat StateView and the
   Colyseus patch tick. Only the socket is replaced. The fake client decodes each state frame
   with a real schema Decoder, so the board the viewer receives is redacted exactly as in
   production, and messages reach it in the order a socket would deliver them:

   - `broadcast` goes out at once, or right after the next state patch when it asks for
     `afterNextPatch` (every `batchClosed`);
   - `client.send` (a decision, a refusal) goes out at once;
   - a state patch goes out on the room's patch tick, or whenever the room calls
     `broadcastPatch()` itself. */

import { Decoder } from "@colyseus/schema";
import type { Client } from "colyseus";
import {
  DECISION_CHANNEL,
  EVENT_CHANNEL,
  GameState,
  type DecisionRequest,
  type Intent,
  type SequencedServerEvent,
} from "@aegis/shared";
import { AegisRoom } from "@aegis-api/rooms/AegisRoom.js";
import type { DevScenarioId } from "@aegis-api/engine/devScenario.js";
import "@aegis-api/cards/index.js";

/** Colyseus `ClientState.JOINED`: the serializer only writes to joined clients. */
const CLIENT_JOINED = 1;

export type WireMessage =
  | { channel: "state"; at: number; bytes: number }
  | { channel: "event"; at: number; event: SequencedServerEvent }
  | { channel: "decision"; at: number; request: DecisionRequest };

export interface ScenarioRoom {
  room: AegisRoom;
  /** The viewer's copy of the state, decoded from the frames the room sent. */
  state: GameState;
  /** Everything sent to the viewer, in delivery order. */
  wire: readonly WireMessage[];
  send(intent: Intent): void;
  dispose(): void;
}

export interface ScenarioRoomOptions {
  scenario: DevScenarioId;
  seed: number;
  humanDeck: { mainDeck: string[]; eggDeck: string[] };
  botDeckId: string;
  onMessage(message: WireMessage): void;
}

type Broadcast = (type: string, message: unknown, options?: { afterNextPatch?: boolean }) => boolean;

/** What travels over the socket is serialized: nothing the room mutates later can leak in. */
function wireCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function openScenarioRoom(options: ScenarioRoomOptions): ScenarioRoom {
  const room = new AegisRoom();
  const decoder = new Decoder(new GameState());
  const wire: WireMessage[] = [];
  const afterPatch: { type: string; message: unknown }[] = [];
  const beforeJoin: { type: string; message: unknown }[] = [];
  let joined = false;

  const record = (entry: WireMessage) => {
    wire.push(entry);
    options.onMessage(entry);
  };
  const deliver = (type: string, message: unknown) => {
    if (!joined) {
      beforeJoin.push({ type, message });
      return;
    }
    if (type === DECISION_CHANNEL)
      record({ channel: "decision", at: Date.now(), request: wireCopy(message as DecisionRequest) });
    else if (type === EVENT_CHANNEL)
      record({ channel: "event", at: Date.now(), event: wireCopy(message as SequencedServerEvent) });
  };

  const client = {
    sessionId: "pacing-viewer",
    state: CLIENT_JOINED,
    view: undefined,
    raw(bytes: Uint8Array) {
      decoder.decode(bytes, { offset: 1 });
      record({ channel: "state", at: Date.now(), bytes: bytes.length });
    },
    enqueueRaw(bytes: Uint8Array) {
      client.raw(bytes);
    },
    send(type: string, message: unknown) {
      deliver(type, message);
    },
  };

  room.broadcast = ((type, message, broadcastOptions) => {
    if (broadcastOptions?.afterNextPatch) afterPatch.push({ type, message });
    else deliver(type, message);
    return true;
  }) as Broadcast as AegisRoom["broadcast"];
  const broadcastPatch = room.broadcastPatch.bind(room);
  room.broadcastPatch = () => {
    const changed = broadcastPatch();
    for (const { type, message } of afterPatch.splice(0)) deliver(type, message);
    return changed;
  };

  // The matchmaker's own set-up: it arms the state serializer and the patch tick.
  room.roomId = `pacing-${options.scenario}`;
  (room as unknown as { __init(): void }).__init();
  (room as unknown as { _listing: object })._listing = {};
  room.onCreate({ seed: options.seed, botRoom: true, devScenario: options.scenario });
  const asClient = client as unknown as Client;
  room.clients.push(asClient);
  room.onJoin(asClient, { displayName: "Viewer", deck: options.humanDeck });
  const serializer = (room as unknown as { _serializer: { getFullState(client: Client): Uint8Array } })._serializer;
  client.raw(serializer.getFullState(asClient));
  joined = true;
  for (const { type, message } of beforeJoin.splice(0)) deliver(type, message);
  if (!room.addBot(options.botDeckId)) throw new Error(`the bot could not join ${options.scenario}`);

  const handleIntent = (room as unknown as { handleIntent(client: Client, intent: Intent): void }).handleIntent.bind(
    room,
  );
  return {
    room,
    state: decoder.state as GameState,
    wire,
    send: (intent) => handleIntent(asClient, intent),
    dispose() {
      room.onDispose();
      room.clock.clear();
      room.clock.stop();
    },
  };
}
