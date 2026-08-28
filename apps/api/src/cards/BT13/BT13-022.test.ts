import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-022.js";

describe("BT13-022 Kamemon", () => {
  it("registers the printed Blocker keyword", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [expect.objectContaining({ keyword: "Blocker" })] }),
    );
  });

  it("exposes Blocker through the public game observer", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-022", as: "kamemon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("kamemon"), "Blocker")).toBe(true);
  });

  it("can suspend to redirect an opposing player attack and is deleted in the resulting battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "attacker", dp: 5000 }] },
      1: { battleArea: [{ card: "BT13-022", as: "kamemon" }], security: ["BT1-010"] },
    });
    const attacker = s.perm("attacker");
    const kamemon = s.perm("kamemon");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: kamemon.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));

    expect(kamemon.isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).not.toContain(kamemon);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
  });
});
