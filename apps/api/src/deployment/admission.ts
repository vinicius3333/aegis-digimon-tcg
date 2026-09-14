import { readFileSync } from "node:fs";

let acceptsRoomCreation = () => true;

/** Both HTTP matchmaking and internal tournament room creation use this gate. */
export function setRoomCreationAdmission(check: () => boolean): void {
  acceptsRoomCreation = check;
}

export function canCreateRoom(): boolean {
  return acceptsRoomCreation();
}

/** Directory-mounted manifest survives atomic replacement and process restarts. */
export function isActiveDeploymentSlot(path: string, slot: string): boolean {
  try {
    const manifest = JSON.parse(readFileSync(path, "utf8")) as { active?: { slot?: string } };
    return manifest.active?.slot === slot;
  } catch {
    return false;
  }
}
