import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-06 Rapidmon", () => {
  it("has Blocker and Armor Purge and gives one opposing Digimon and all Security Digimon -4000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST17-06", as: "rapidmon", suspended: true }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 6000 }],
          security: [
            { card: "BT1-009", faceUp: true },
            { card: "BT1-010", faceUp: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("rapidmon").permanentId, "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("rapidmon").permanentId, "Armor Purge")).toBe(true);
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      suspendedPermanentId: s.perm("rapidmon").permanentId,
    });

    expect(s.perm("target").currentDP).toBe(2000);
    expect(observe(s.engine).securityDp(1)).toBe(-4000);
  });

  it("gives its suspended host +1000 DP through the inherited effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-07", as: "host", suspended: true, under: ["ST17-06"] }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(8000);
  });
});
