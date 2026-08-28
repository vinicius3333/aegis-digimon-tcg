import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guard: `GameEngine`'s interface carries no test-only members.
 *
 * Tests reach engine behavior through the Test Seam — a Board Spec to arrange, Intents to
 * act, `observe()` / `advance()` to see past the interface. When that seam is missing an
 * affordance the fix is to name it there, never to widen `GameEngine` with a `*ForTest`
 * member: the interface is what production callers must understand, and a test-only member
 * on it is a permanent tax on every reader.
 *
 * Mirrors `state/mutationSeam.guard.test.ts`: drift is a build failure, not a silent leak.
 *
 * The companion rule — no `engine as unknown as` outside `testkit/internals.ts` — lands with
 * the test-suite sweep, once the ~200 files still casting have been moved onto the seam.
 */

const ENGINE_FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "GameEngine.ts");

const TEST_ONLY_MEMBER = /^\s*(?:get |set |async )?(\w*(?:ForTest|ForTests|TestOnly))\s*[(:]/gm;

describe("test seam guard", () => {
  it("keeps test-only members off GameEngine's interface", () => {
    const source = readFileSync(ENGINE_FILE, "utf8");
    const members = [...source.matchAll(TEST_ONLY_MEMBER)].map((match) => match[1]);
    expect(members, "expose this through testkit/observe.ts or testkit/advance.ts instead").toEqual([]);
  });
});
