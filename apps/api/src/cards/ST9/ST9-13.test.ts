import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST9-13.js";

describe("ST9-13 GranKuwagamon", () => {
  it("gets +4000 DP when digivolving and has its printed Security Attack +1", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST9-11", as: "base" }], hand: [{ card: "ST9-13", as: "gran" }], deck: ["BT1-001"] },
      1: { deck: ["BT1-002"] },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gran").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === s.perm("base").baseDP + 4000);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(1);
  });

  it("performs two security checks from its inherited Security Attack +1", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST9-11", as: "base" }], hand: [{ card: "ST9-13", as: "gran" }], deck: ["BT1-003"] },
      1: { security: ["BT1-001", "BT1-002"], deck: ["BT1-004"] },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gran").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack") === 1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("expires its digivolving DP boost at the end of the turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST9-12", as: "base" }],
        hand: [{ card: "ST9-13", as: "gran" }],
        deck: ["BT1-010", "BT1-010"],
      },
      1: { deck: ["BT1-001", "BT1-006"] },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gran").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === s.perm("base").baseDP + 4000);
    await (s.engine as unknown as { mainVerbChain: Promise<void> }).mainVerbChain;
    expect(s.perm("base").currentDP).toBe(s.perm("base").baseDP + 4000);
    await advance(s.engine).runTurn(0);
    expect(s.perm("base").currentDP).toBe(s.perm("base").baseDP);
  });
});
