import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST7-10.js";

describe("ST7-10 ShineGreymon", () => {
  it("has Security Attack +1 and Piercing", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST7-10", as: "shine" }] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("shine"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasPierce(s.perm("shine"))).toBe(true);
  });

  it("performs a security check after deleting an opposing Digimon in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST7-10", as: "shine" }] },
      1: { battleArea: [{ card: "ST7-02", as: "target", suspended: true }], security: ["ST7-01", "ST7-01"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shine").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
