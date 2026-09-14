import { readFileSync } from "node:fs";

export const SLOTS = ["blue", "green"];

export function validateManifest(value) {
  const validRevision = (entry) =>
    entry &&
    SLOTS.includes(entry.slot) &&
    typeof entry.revision === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(entry.revision);
  if (
    value?.version !== 1 ||
    !validRevision(value.active) ||
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
