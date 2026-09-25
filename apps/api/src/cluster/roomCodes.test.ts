import { describe, expect, it } from "vitest";
import { createLocalRoomCodeDirectory, createSharedRoomCodeDirectory } from "./roomCodes.js";

/** The two presence calls the shared directory uses, over a plain Map. */
function fakePresence() {
  const store = new Map<string, string>();
  return {
    store,
    hset: (key: string, field: string, value: string) => {
      store.set(`${key}/${field}`, value);
      return Promise.resolve(true);
    },
    hget: (key: string, field: string) => Promise.resolve(store.get(`${key}/${field}`) ?? null),
    hdel: (key: string, field: string) => Promise.resolve(store.delete(`${key}/${field}`)),
  };
}

describe.each([
  ["local", () => createLocalRoomCodeDirectory()],
  ["shared", () => createSharedRoomCodeDirectory(fakePresence() as never, "aegis:legacy:")],
])("%s room code directory", (_name, create) => {
  it("resolves a claimed code to its room", async () => {
    const directory = create();
    directory.claim("ABC123", "room-1");
    await expect(directory.resolve("ABC123")).resolves.toBe("room-1");
  });

  it("reports an unknown code as absent", async () => {
    await expect(create().resolve("NOPE12")).resolves.toBeUndefined();
  });

  it("forgets a released code", async () => {
    const directory = create();
    directory.claim("ABC123", "room-1");
    directory.release("ABC123", "room-1");
    await new Promise((resolve) => setTimeout(resolve, 0));
    await expect(directory.resolve("ABC123")).resolves.toBeUndefined();
  });

  it("keeps a code another room has claimed since", async () => {
    const directory = create();
    directory.claim("ABC123", "room-1");
    directory.claim("ABC123", "room-2");
    directory.release("ABC123", "room-1");
    await new Promise((resolve) => setTimeout(resolve, 0));
    await expect(directory.resolve("ABC123")).resolves.toBe("room-2");
  });
});

describe("shared room code directory", () => {
  it("namespaces its entries by slot so two slots never resolve each other's codes", async () => {
    const presence = fakePresence();
    const blue = createSharedRoomCodeDirectory(presence as never, "aegis:blue:");
    const green = createSharedRoomCodeDirectory(presence as never, "aegis:green:");
    blue.claim("ABC123", "blue-room");
    await expect(green.resolve("ABC123")).resolves.toBeUndefined();
    await expect(blue.resolve("ABC123")).resolves.toBe("blue-room");
  });
});
