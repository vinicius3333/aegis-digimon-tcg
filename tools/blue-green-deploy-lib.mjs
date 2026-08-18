export function chooseDeploymentAction({ state, request, activeRooms }) {
  if (state.active?.revision === request.revision) {
    return { kind: "noop", slot: state.active.slot };
  }

  const targetSlot = state.active ? oppositeSlot(state.active.slot) : "blue";
  if (state.draining?.slot === targetSlot && (activeRooms[targetSlot] ?? 0) > 0) {
    return { kind: "queue", pending: request };
  }
  return { kind: "deploy", targetSlot };
}

export function chooseDrainAction({ state, activeRooms }) {
  if (!state.draining) return { kind: "idle" };
  if (activeRooms > 0) {
    return {
      kind: "wait",
      slot: state.draining.slot,
      activeRooms,
    };
  }
  return { kind: "cleanup", slot: state.draining.slot };
}

export function chooseBootstrapAction({ connectionCount, zeroSince, now, stableMilliseconds }) {
  if (connectionCount > 0) {
    return { kind: "wait", connectionCount, zeroSince: null };
  }
  if (zeroSince === null) {
    return { kind: "mark_zero", zeroSince: now };
  }
  const remainingMilliseconds = Math.max(0, stableMilliseconds - (now - zeroSince));
  if (remainingMilliseconds > 0) {
    return { kind: "wait", connectionCount: 0, zeroSince, remainingMilliseconds };
  }
  return { kind: "finalize" };
}

export function buildDeploymentManifest(state) {
  if (!state.active) throw new Error("Cannot build a deployment manifest without an active slot");
  return {
    version: 1,
    active: { ...state.active },
    draining: state.draining ? [{ ...state.draining }] : [],
  };
}

export function oppositeSlot(slot) {
  if (slot === "blue") return "green";
  if (slot === "green") return "blue";
  throw new Error(`Invalid deployment slot: ${slot}`);
}

export function emptyDeploymentState() {
  return {
    version: 1,
    active: null,
    draining: null,
    pending: null,
    bootstrap: null,
    slots: {},
  };
}
