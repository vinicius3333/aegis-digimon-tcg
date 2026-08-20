import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DIGIMON_WORLD_AVATARS, digimonAvatarUrl } from "./avatars";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "../../public");

describe("Digimon World portraits", () => {
  it("ships a file for every avatar in the roster", () => {
    const missing = DIGIMON_WORLD_AVATARS.filter(({ id }) => !existsSync(join(publicDir, digimonAvatarUrl(id))));

    expect(missing.map(({ id }) => id)).toEqual([]);
  });
});
