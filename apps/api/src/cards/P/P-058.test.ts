import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-058.js";

describe("P-058 Gammamon", () => {
  it("can attack an opponent's unsuspended Digimon while a red Tamer is in play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-062" }, { card: "P-058", as: "gammamon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    await s.ready();

    expect(observe(s.engine).canAttackUnsuspended(s.perm("gammamon"))).toBe(true);
    expect([...s.perm("gammamon").attackablePermanentIds]).toContain(
      s.perm("target").permanentId,
    );
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("gammamon").permanentId,
      target: { kind: "permanent", permanentId: s.perm("target").permanentId },
    })).toEqual({ ok: true });
  });

  it("can't attack an unsuspended Digimon without a red Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009" }, { card: "P-058", as: "gammamon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    await s.ready();

    expect(observe(s.engine).canAttackUnsuspended(s.perm("gammamon"))).toBe(false);
    expect([...s.perm("gammamon").attackablePermanentIds]).not.toContain(
      s.perm("target").permanentId,
    );
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("gammamon").permanentId,
      target: { kind: "permanent", permanentId: s.perm("target").permanentId },
    })).toEqual({ ok: false, reason: "illegal-target" });
  });
});
