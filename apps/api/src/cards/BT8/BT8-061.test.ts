import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-061.js";
import "./BT8-068.js";

describe("BT8-061 Thundermon", () => {
  it("is also treated as having the name Mamemon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-061", as: "thundermon" }] } });
    await s.ready();
    expect(observe(s.engine).grantedNames(s.perm("thundermon"))).toContain("mamemon");
  });
});

describe("BT8-061 Thundermon — KB Q&A rulings", () => {
  it("is always treated as also having the [Mamemon] name, so it satisfies BanchoMamemon's condition (Q1744)", async () => {
    async function banchoMamemonSecurityAttackWith(companionCardId: string): Promise<number> {
      const s = setupEngine({
        0: {
          battleArea: [
            { card: "BT8-068", as: "banchoMamemon" },
            { card: companionCardId, as: "companion" },
          ],
        },
      });
      await s.ready();
      return observe(s.engine).keywordAmount(s.perm("banchoMamemon"), "SecurityAttack");
    }

    expect(await banchoMamemonSecurityAttackWith("BT8-061")).toBe(1);
    expect(await banchoMamemonSecurityAttackWith("BT8-060")).toBe(0);
  });
});
