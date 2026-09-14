# Room-preserving production deployments

The authorized change replaces production application recreation with two isolated
deployment slots. The Oracle VPS retains its existing Postgres and external edge
Caddy. A stable Node gateway serves immutable web releases and proxies HTTP and
WebSockets directly to the exact API process advertised by Colyseus.

An atomically replaced directory-mounted manifest selects the active slot. The
gateway and every API enforce that selection for new room creation. The API also
guards internal tournament room creation, while existing joins, bot seating, and
reconnections remain possible on the retiring slot. Each slot has three APIs and
its own Redis instance and volume.

The deploy controller builds API and web images serially, starts only an idle
slot, checks every process, and publishes the new routing manifest. It drains the
previous slot and removes it only after all three owners report zero rooms and
clients. An unavailable owner or a busy slot blocks cleanup and slot reuse. A
failed build leaves the active deployment untouched. Static assets remain
available across cutovers. Repeated deployment of an active revision is a no-op.

Dokploy uses an installed one-shot deployer container instead of its default
`compose up --build --remove-orphans`. The controller runs with a Docker socket
and host-identical source/state mounts; the serving gateway has no Docker socket
and mounts state read-only. Infrastructure images are updated separately from
routine application releases.

The first edge/gateway migration requires a verified empty-room window. Admission
is temporarily blocked while the new stack is prepared, and any room appearing
before the gate closes must be preserved until disposal. Subsequent manifest
cutovers do not reload the gateway or edge configuration.

Validation covers unchanged sockets across manifest replacement, exact owner
routes, reconnecting to the old slot, retained assets, isolated Redis addresses,
literal-dollar credentials, internal creation admission, and refusal to stop a
busy or unverifiable owner. Live validation additionally uses real Colyseus
rooms and seat reservations on the VPS before restoring automatic deployment.
