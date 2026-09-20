import { readFileSync } from "node:fs";

const LEGACY_SLOTS = new Set(["blue", "green"]);

export function isDeploymentSlot(value) {
  return typeof value === "string" && (LEGACY_SLOTS.has(value) || /^g-[a-f0-9]{12}$/.test(value));
}

export function validateManifest(value) {
  const validRevision = (entry) =>
    entry &&
    isDeploymentSlot(entry.slot) &&
    typeof entry.revision === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(entry.revision);
  if (
    value?.version !== 1 ||
    !validRevision(value.active) ||
    (value.webRevision !== undefined &&
      (typeof value.webRevision !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(value.webRevision))) ||
    !Array.isArray(value.draining) ||
    !value.draining.every(validRevision) ||
    new Set([value.active.slot, ...value.draining.map((entry) => entry.slot)]).size !== 1 + value.draining.length
  ) {
    throw new Error("Invalid deployment manifest");
  }
  return value;
}

export function readManifest(state) {
  return validateManifest(JSON.parse(readFileSync(`${state}/routing/manifest.json`, "utf8")));
}

export function assertEmptySlot(statuses, slot) {
  if (
    statuses.length !== 3 ||
    statuses.some(
      (status) =>
        status.slot !== slot ||
        status.acceptingNewRooms !== false ||
        !Number.isInteger(status.activeRooms) ||
        status.activeRooms !== 0 ||
        !Number.isInteger(status.connectedClients) ||
        status.connectedClients !== 0,
    )
  ) {
    throw new Error(
      `${slot} still owns rooms/clients, accepts creation, or has unverifiable processes; leaving it running`,
    );
  }
}
