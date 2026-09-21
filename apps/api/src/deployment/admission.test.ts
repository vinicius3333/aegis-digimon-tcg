import { mkdtempSync, mkdirSync, writeFileSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { AegisRoom, roomRegistry } from "../rooms/AegisRoom.js";
import { canCreateRoom, isActiveDeploymentSlot, setRoomCreationAdmission } from "./admission.js";
import { createDeploymentRuntime } from "./runtime.js";

const directories: string[] = [];

afterEach(() => {
  setRoomCreationAdmission(() => true);
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true });
});

describe("persistent deployment admission", () => {
  it("fails closed and follows atomically replaced routing decisions", () => {
    const directory = mkdtempSync(`${tmpdir()}/aegis-admission-`);
    directories.push(directory);
    mkdirSync(`${directory}/routing`);
    const path = `${directory}/routing/manifest.json`;
    const runtime = createDeploymentRuntime({
      slot: "blue",
      revision: "v1",
      adminToken: "token",
      activeRooms: () => 0,
      connectedClients: () => 0,
      readiness: async () => true,
      canAcceptNewRooms: () => isActiveDeploymentSlot(path, "blue"),
    });
    expect(runtime.allowMatchmaking("create")).toBe(false);
    writeFileSync(path, JSON.stringify({ active: { slot: "blue" } }));
    expect(runtime.allowMatchmaking("create")).toBe(true);
    writeFileSync(`${path}.next`, JSON.stringify({ active: { slot: "green" } }));
    renameSync(`${path}.next`, path);
    expect(runtime.status().acceptingNewRooms).toBe(false);
    expect(runtime.allowMatchmaking("joinById")).toBe(true);
    expect(runtime.allowMatchmaking("reconnect")).toBe(true);
    runtime.activate();
    expect(runtime.allowMatchmaking("create")).toBe(false);
    writeFileSync(path, "invalid");
    expect(runtime.allowMatchmaking("create")).toBe(false);
  });

  it("routes fixed red slot room creation from the active manifest and leaves reconnect available", () => {
    const directory = mkdtempSync(`${tmpdir()}/aegis-red-admission-`);
    directories.push(directory);
    mkdirSync(`${directory}/routing`);
    const path = `${directory}/routing/manifest.json`;
    writeFileSync(path, JSON.stringify({ active: { slot: "red" } }));
    const runtime = createDeploymentRuntime({
      slot: "red",
      revision: "red-revision",
      adminToken: "token",
      activeRooms: () => 0,
      connectedClients: () => 0,
      readiness: async () => true,
      canAcceptNewRooms: () => isActiveDeploymentSlot(path, "red"),
    });

    setRoomCreationAdmission(() => runtime.allowMatchmaking("create"));
    expect(canCreateRoom()).toBe(true);
    const room = new AegisRoom();
    room.roomId = "red-active-room";
    room.onCreate({});
    expect(roomRegistry.has(room.roomId)).toBe(true);
    room.onDispose();
    expect(runtime.allowMatchmaking("reconnect")).toBe(true);

    writeFileSync(`${path}.next`, JSON.stringify({ active: { slot: "blue" } }));
    renameSync(`${path}.next`, path);
    expect(canCreateRoom()).toBe(false);
    expect(() => new AegisRoom().onCreate({})).toThrow("draining");
    expect(runtime.allowMatchmaking("reconnect")).toBe(true);
  });

  it("blocks direct internal room construction before it can acquire a registry entry", () => {
    setRoomCreationAdmission(() => false);
    const room = new AegisRoom();
    room.roomId = "draining-internal-room";
    expect(canCreateRoom()).toBe(false);
    expect(() => room.onCreate({ botRoom: true })).toThrow("draining");
    expect(roomRegistry.has(room.roomId)).toBe(false);
    expect(() => room.onDispose()).not.toThrow();
  });
});
