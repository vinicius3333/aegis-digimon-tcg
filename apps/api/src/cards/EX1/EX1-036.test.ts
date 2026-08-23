import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX1-036.js";

describe("EX1-036 Togemon", () => {
  it("gives its host +2000 DP when an opposing Digimon becomes suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-038", as: "host", under: ["EX1-036"], dp: 5000 }] },
      1: { battleArea: [{ card: "BT1-070", as: "opponent" }] },
    });
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
    expect(s.perm("host").currentDP).toBe(7000);
  });
});
