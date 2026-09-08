import { describe, expect, it } from "vitest";
import { EffectDuration } from "@aegis/shared";
import { advance } from "./advance.js";
import { setupEngine } from "./harness.js";
import { observe } from "./observe.js";
import "../../cards/index.js";

/**
 * Seam 7 `testkit-link-grant-affordance`.
 *
 * Two Test Seam gaps the EX10 re-audit found: no affordance raised a Digimon's ＜Link＞ maximum
 * (proofs reached past the seam into `continuous.addLinkMaxGrant`), and a Board Spec's seeded
 * link card did not add its printed `linkDp` until a real `linkCard` intent ran, so every DP
 * baseline taken around a seeded link was wrong.
 */
describe("link affordances on the Test Seam", () => {
  it("advance().verb.grantLinkMax raises the link maximum", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-023", as: "host" }] },
      1: {},
    });
    await s.ready();

    expect(observe(s.engine).linkMaxDelta(s.perm("host"))).toBe(0);
    await advance(s.engine).verb.grantLinkMax(s.perm("host").permanentId, 2, EffectDuration.Permanent);
    expect(observe(s.engine).linkMaxDelta(s.perm("host"))).toBe(2);
  });

  it("a seeded link card's printed link DP is in the host's DP at setup", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-023", as: "host", linked: [{ card: "BT21-009", as: "linked" }] }] },
      1: {},
    });
    await s.ready();

    // BT21-023 Globemon prints 10000 DP; the linked BT21-009 Gatchmon adds its 2000 link DP.
    expect(s.perm("host").currentDP).toBe(12000);
  });
});
