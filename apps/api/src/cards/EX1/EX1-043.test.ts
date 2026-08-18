import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX1-043.js";

describe("EX1-043 HerculesKabuterimon", () => {
  it("gets +1000 DP per Insectoid source", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-043", as: "hercules", dp: 12000, under: ["BT1-066", "BT1-070"] }] } });
    await s.ready();
    expect(s.perm("hercules").currentDP).toBe(14000);
  });

  it("may unsuspend after an Insectoid deletes an opponent in battle", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-043", as: "hercules", suspended: true }, { card: "BT1-070", as: "insectoid" }] } }, { autoAcceptOptional: true });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("insectoid").permanentId });
    expect(s.perm("hercules").isSuspended).toBe(false);
  });

  it("does not unsuspend after a non-Insectoid deletes an opponent in battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-043", as: "hercules", suspended: true },
          { card: "BT1-009", as: "nonInsectoid" },
        ],
      },
    }, { autoAcceptOptional: true });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("nonInsectoid").permanentId,
    });

    expect(s.perm("hercules").isSuspended).toBe(true);
  });
});
