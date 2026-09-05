import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX1-044.js";

describe("EX1-044 Keramon", () => {
  it("counts exact matches of the live host name, excluding Keramon, near names, and opponents", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          // EX1-044 is a legal Lv.3 source under the Lv.4 Kurisarimon host.
          { card: "EX1-046", as: "host", under: ["EX1-044"], dp: 5000 },
          { card: "BT2-059", as: "same1" },
          { card: "BT5-063", as: "same2" },
          // Q3231: this Keramon does not match the live host name Kurisarimon.
          { card: "EX1-044", as: "differentName" },
        ],
      },
      1: { battleArea: [{ card: "BT2-059", as: "opponentSameName" }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(7000);
  });
});
