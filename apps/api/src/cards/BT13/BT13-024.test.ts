import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-024.js";

describe("BT13-024 Gawappamon", () => {
  it("registers the printed Blocker keyword", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [expect.objectContaining({ keyword: "Blocker" })] }),
    );
  });

  it("exposes Blocker through the public game observer", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-024", as: "gawappamon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("gawappamon"), "Blocker")).toBe(true);
  });

  it("redirects a player attack and survives after deleting the weaker attacker", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "attacker", dp: 4000 }] },
      1: { battleArea: [{ card: "BT13-024", as: "gawappamon" }], security: ["BT1-010"] },
    });
    const attackerId = s.perm("attacker").permanentId;
    const gawappamonId = s.perm("gawappamon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: gawappamonId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerId)).toBe(false);
    expect(s.perm("gawappamon").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
  });
});
