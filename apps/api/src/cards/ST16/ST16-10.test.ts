import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST16-10.js";

describe("ST16-10 Mammothmon", () => {
  it("exposes Blocker and inherited Retaliation from its evolution stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST16-11", as: "host", under: [{ card: "ST16-10" }] }] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
  });

  it("does not lose its printed keywords when the host is suspended", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST16-10", as: "mammothmon" }] } });
    await s.engine.recomputeContinuousEffects();
    await advance(s.engine).verb.suspend([s.perm("mammothmon").permanentId]);
    await settle(() => s.perm("mammothmon").isSuspended);

    expect(observe(s.engine).hasKeyword(s.perm("mammothmon"), "Blocker")).toBe(true);
  });

  it("deletes the opposing attacker when its host loses a real battle through inherited Retaliation", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST1-10", as: "attacker" }] },
      1: { battleArea: [{ card: "ST2-11", as: "mammothmon", suspended: true, under: ["ST16-10"] }] },
    });
    const attackerId = s.perm("attacker").permanentId;
    const mammothId = s.perm("mammothmon").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: mammothId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === mammothId)).toBe(false);
  });
});
