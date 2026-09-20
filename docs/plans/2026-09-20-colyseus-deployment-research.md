# Colyseus deployment research

Date: 2026-09-20

Scope: official Colyseus documentation and first-party source code relevant to deploying new server versions while WebSocket rooms are active. This note records framework behavior and limited implications; it does not prescribe an Aegis deployment design.

## Conclusions

1. A live room has one process owner. Colyseus documents that each room belongs to a single process and that client connections go directly to the process that created the room. Shared Redis infrastructure lets processes discover rooms, coordinate matchmaking, and invoke operations on the owning process; it does not make the live room or its socket connection process-independent. [Scalability](https://docs.colyseus.io/scalability)
2. `RedisPresence` and `RedisDriver` have coordination/catalog roles, not transparent live-state migration roles. Presence supplies inter-process communication and shared key/value storage. The driver stores and queries matchmaker room records. Neither official API description says that it serializes a live `Room` instance, transfers its timers/callbacks, or moves an established WebSocket to another process. [Presence](https://docs.colyseus.io/server/presence), [Driver](https://docs.colyseus.io/server/driver)
3. Production graceful shutdown is a drain/dispose lifecycle, not live migration. The process is excluded from new room creation, its rooms are locked, every room receives `onBeforeShutdown()`, and the server waits for all local rooms to dispose before closing transport, presence, and driver. The default room hook disconnects clients immediately; an override can delay disposal so a game can finish. [Graceful Shutdown](https://docs.colyseus.io/server/graceful-shutdown)
4. Reconnection preserves a seat in an existing server-side room. It requires `allowReconnection()`, a valid reconnection token, and the room to remain available. This is useful for transient connection loss but is not documented as a mechanism for transferring a room to a different production process. [Reconnection](https://docs.colyseus.io/room/reconnection)
5. Colyseus contains room cache/restore behavior for development reloads, but explicitly warns that it is costly and should not be used in production. First-party source labels the related hot-reload path “DO NOT USE THIS IN PRODUCTION” and shows it disposing/restoring room instances rather than migrating an open socket. [Server `devMode` source](https://github.com/colyseus/colyseus/blob/master/packages/core/src/Server.ts), [MatchMaker hot-reload source](https://github.com/colyseus/colyseus/blob/master/packages/core/src/MatchMaker.ts)

## Process and room ownership

The official scaling model states:

- increasing processes increases room capacity;
- rooms are distributed among available processes;
- each room belongs to one Colyseus process;
- a client's connection is directly associated with the process that created the room.

Matchmaking therefore has two phases. Any process may receive the seat-reservation request and use shared presence/driver services to coordinate it. The client then establishes the WebSocket directly with the process that created the room. Each process needs a distinct `publicAddress` so the reservation can route the client to the owner. [Scalability](https://docs.colyseus.io/scalability)

The first-party matchmaker implementation reinforces that ownership model. Room creation selects a process; when it selects another process, creation is requested over IPC. A created room is instantiated locally and its matchmaker listing records that process ID. Remote seat reservation is likewise an IPC call to the room owner. [MatchMaker source](https://github.com/colyseus/colyseus/blob/master/packages/core/src/MatchMaker.ts)

Implication: routing a new HTTP or matchmaking request to a new deployment does not relocate an already-created room. The old owner must remain addressable while that room continues.

## RedisPresence and RedisDriver

### RedisPresence

The Presence API is responsible for IPC and shared storage across processes or machines. The scaling guide specifically uses it so one process can ask another process to create a room or reserve a seat. `LocalPresence` is process-local; `RedisPresence` supplies the shared pub/sub and key/value substrate required for distributed operation. [Presence](https://docs.colyseus.io/server/presence), [Scalability](https://docs.colyseus.io/scalability)

### RedisDriver

The Driver stores and queries room data used by the matchmaker. It persists room creation/deletion and metadata changes so all processes can find available rooms. An external driver such as Redis is needed when processes must share this catalog. [Driver](https://docs.colyseus.io/server/driver)

The distinction is operationally significant:

- Presence: communication with the process that owns the room, plus shared coordination data.
- Driver: shared matchmaker listing/catalog.
- Owner process: executable `Room` instance, authoritative live state and client transport.

Implication: Redis enables multi-process routing and coordination but, by itself, is not evidence that a running room can survive destruction of its owner.

## Reconnection and seat reservations

The documented reconnection contract is centered on the same room:

- the server calls `allowReconnection()` after a non-consented drop to hold the client's seat;
- automatic SDK retry retains the client-side room object;
- after a page/app restart, the client can use a stored `reconnectionToken` with `client.reconnect()`;
- the reconnect succeeds only while the seat remains reserved;
- a successful connection gets a refreshed token.

The docs explicitly describe automatic retries as depending on the server-side room still being alive. Manual reconnection recreates the client-side object, but follows the same server-side held-seat flow. [Reconnection](https://docs.colyseus.io/room/reconnection)

Production shutdown ultimately disconnects clients with `SERVER_SHUTDOWN` (`4001`); source code reserves `MAY_TRY_RECONNECT` for development mode. [Deployment](https://docs.colyseus.io/deployment), [MatchMaker graceful-shutdown source](https://github.com/colyseus/colyseus/blob/master/packages/core/src/MatchMaker.ts)

Implication: reconnection can mask a transport interruption only when the corresponding server-side continuity exists. It is not a documented substitute for production room-state persistence/restoration across versions.

## Graceful shutdown and draining

Colyseus automatically registers graceful shutdown for `SIGTERM`, `SIGINT`, `SIGUSR2`, and uncaught exceptions unless disabled. The documented order is:

1. run the server's `onBeforeShutdown()` callback;
2. exclude the process from selection for new rooms;
3. lock all of its rooms;
4. invoke each room's `onBeforeShutdown()`;
5. wait until the local room count reaches zero;
6. close transport, presence, and driver;
7. run the server's `onShutdown()` callback;
8. terminate the process.

The default `Room.onBeforeShutdown()` calls `room.disconnect()`, quickly triggering client leave and room disposal. The official example overrides the hook to notify players and delay `disconnect()` for five minutes. Async `onLeave`, `onDispose`, and server shutdown hooks are awaited. [Graceful Shutdown](https://docs.colyseus.io/server/graceful-shutdown)

First-party implementation matches the documentation: graceful shutdown locks/disposes rooms, removes their matchmaker records, unsubscribes the process IPC channel, and disconnects remaining clients. [Server shutdown source](https://github.com/colyseus/colyseus/blob/master/packages/core/src/Server.ts), [MatchMaker shutdown source](https://github.com/colyseus/colyseus/blob/master/packages/core/src/MatchMaker.ts)

Implication: the supported continuity pattern is to stop assigning new rooms to an old process while letting or causing its existing rooms to dispose. Keeping that process alive for the drain period preserves its live rooms; stopping it does not transfer them.

## Can a live room migrate between Node processes?

No official production mechanism found in the reviewed documentation or first-party source transfers a running room and its existing WebSocket connections from one Node process to another.

The strongest direct evidence is the combination of:

- explicit single-process room ownership and direct client-to-owner connections in the scaling guide;
- Presence/Driver APIs limited to IPC/shared storage and matchmaker records;
- graceful shutdown waiting for local rooms to dispose;
- production shutdown disconnecting clients with `SERVER_SHUTDOWN`;
- room restoration being confined to development mode and explicitly discouraged for production.

This conclusion is an inference from official behavior, not an explicit Colyseus sentence saying “room migration is impossible.” A custom application could persist enough domain state to create a replacement room and ask clients to reconnect, but that would be application-level checkpoint/restore and a new transport connection, not transparent migration supplied by Colyseus.

## Recommended first-party multi-process pattern

Official guidance for self-hosting multiple processes is:

- shared `RedisPresence` and `RedisDriver` (or another external driver supported for shared room listings);
- a unique public address for each process;
- a regular load balancer as the initial endpoint, after which the reservation points the client at the room owner;
- separate ports/processes managed in fork mode (the docs explicitly say not to use PM2 cluster mode);
- graceful shutdown/draining for deploys;
- a health-check endpoint for load-balancer decisions.

[Scalability](https://docs.colyseus.io/scalability), [Deployment](https://docs.colyseus.io/deployment)

Colyseus also documents an experimental Traefik integration that dynamically registers instances, provides an all-servers route for new connections, and creates per-server routes for sticky routing to the owner. On graceful shutdown it removes the server registration. This reinforces the separation between routing new work and retaining owner-specific reachability for existing rooms. [Traefik Load Balancer](https://docs.colyseus.io/scalability/traefik)

## Source inventory

- [Colyseus: Scalability](https://docs.colyseus.io/scalability)
- [Colyseus: Deployment](https://docs.colyseus.io/deployment)
- [Colyseus: Graceful Shutdown](https://docs.colyseus.io/server/graceful-shutdown)
- [Colyseus: Presence](https://docs.colyseus.io/server/presence)
- [Colyseus: Driver](https://docs.colyseus.io/server/driver)
- [Colyseus: Reconnection](https://docs.colyseus.io/room/reconnection)
- [Colyseus: Traefik Load Balancer](https://docs.colyseus.io/scalability/traefik)
- [Colyseus first-party `Server.ts`](https://github.com/colyseus/colyseus/blob/master/packages/core/src/Server.ts)
- [Colyseus first-party `MatchMaker.ts`](https://github.com/colyseus/colyseus/blob/master/packages/core/src/MatchMaker.ts)
