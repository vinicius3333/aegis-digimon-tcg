import { describe, expect, it } from "vitest";
import { compiled } from "./ST18-07.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST18-07 Kokatorimon", () => {
  it("has Blocker itself and publishes Piercing as an inherited keyword", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST18-07", as: "blocker" },
          { card: "ST18-09", as: "host", under: ["ST18-07"] },
        ],
      },
    });

    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("blocker"), "Blocker")).toBe(true);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        isInherited: true,
        keywords: [expect.objectContaining({ keyword: "Piercing" })],
      }),
    );
  });
});
