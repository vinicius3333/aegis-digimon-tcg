# Room-preserving production deployments

Production uses three fixed API slots: blue, red, and green. The Oracle VPS retains its existing Postgres and external edge Caddy. A stable Node gateway serves immutable web releases and proxies HTTP and WebSockets directly to the exact API process advertised by Colyseus.

An atomically replaced directory-mounted manifest selects the active slot and lists retired slots that are still draining. The gateway and every API enforce the active slot for new room creation. The API also guards internal tournament room creation, while existing joins, bot seating, and reconnections remain possible on a retiring slot. Each fixed slot has three APIs and its own Redis instance and volume.

The deploy controller builds API and web images serially, then selects the next unoccupied slot in blue/red/green rotation. It checks every process before publishing the new routing manifest. The old active slot stops accepting new rooms and remains routable while matches continue. Cleanup removes it only after all three processes report closed admission, zero rooms, and zero clients. An unavailable owner, a busy slot, or a full three-slot ring blocks reuse. A failed build leaves the active deployment untouched. Static assets remain available across cutovers. Repeated deployment of the active fixed-slot revision is a no-op.

Legacy revision-named g-<12 hex> deployments remain readable and routable during migration. New releases always use fixed slots. The first fixed-slot release moves new room creation to an empty fixed slot and retains old generation identifiers in draining. A generation is removed only after the same three-process empty-slot proof. Compatibility for g-... remains until every old generation has been cleaned.

Dokploy uses an installed one-shot deployer container instead of its default compose up --build --remove-orphans. The controller runs with a Docker socket and host-identical source/state mounts; the serving gateway has no Docker socket and mounts state read-only. Infrastructure images are updated separately from routine application releases.

The first edge/gateway migration requires a verified empty-room window or a parallel gateway switch at the outer proxy because replacing the sole gateway disconnects established WebSockets. Admission is temporarily blocked while a replacement is prepared. Subsequent manifest cutovers do not reload the gateway or edge configuration.

Validation covers unchanged sockets across manifest replacement, exact owner routes, reconnecting to a draining slot and a legacy g-... generation, retained assets, isolated Redis addresses, literal-dollar credentials, internal creation admission, safe fixed-slot rotation, and refusal to stop a busy or unverifiable owner. Live validation additionally uses real Colyseus rooms and seat reservations on the VPS before restoring automatic deployment.
