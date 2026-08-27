import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-058.js";

describe("BT3-058 BanchoStingmon", () => {
  it("gets +7000 DP and Security Attack +2 when attacking a 12000 DP Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT3-058", as: "banchoStingmon" }] },
      1: { battleArea: [{ card: "BT2-083", dp: 12000, suspended: true, as: "target" }] },
    });
    const baseDP = s.perm("banchoStingmon").baseDP;
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("banchoStingmon"))).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("banchoStingmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("banchoStingmon").currentDP === baseDP + 7000 &&
        observe(s.engine).keywordAmount(s.perm("banchoStingmon"), "SecurityAttack") === 2,
      5000,
    );

    expect(s.perm("banchoStingmon").currentDP).toBe(baseDP + 7000);
    expect(observe(s.engine).keywordAmount(s.perm("banchoStingmon"), "SecurityAttack")).toBe(2);
  });
});
