import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-039.js";

describe("EX1-039 Lillymon", () => {
  it("gives its host Security Attack +1 when an opposing Digimon becomes suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-042", as: "host", under: ["EX1-039"] }] },
      1: { battleArea: [{ card: "BT1-070", as: "opponent" }] },
    });
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });
});
