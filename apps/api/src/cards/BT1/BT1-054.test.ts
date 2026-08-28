import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../ST2/ST2-13.js";
import "./BT1-054.js";

describe("BT1-054 Liamon", () => {
  it("gives an opposing Digimon -2000 DP when attacking with at least 3 memory", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-054", as: "attacker" }] },
        1: { battleArea: [{ card: "BT1-016", as: "target", dp: 5000 }], security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("keeps the activated DP reduction after security lowers memory below 3", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-054", as: "attacker" }] },
        1: { battleArea: [{ card: "BT1-016", as: "target", dp: 5000 }], security: ["ST2-13"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.memory === 1);
    expect(s.state.memory).toBe(1);
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("does not reduce DP when the attack starts with only 2 memory", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-054", as: "attacker" }] },
        1: { battleArea: [{ card: "BT1-016", as: "target", dp: 5000 }], security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("target").currentDP).toBe(5000);
  });

  it("restores the target's DP at the end of the turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-054", as: "attacker" }] },
        1: { battleArea: [{ card: "BT1-016", as: "target", dp: 5000 }], security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);

    await advance(s.engine).runTurn(0);

    expect(s.perm("target").currentDP).toBe(5000);
  });

  it("resolves its attack trigger from a newly evolved Liamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-050", as: "base" }],
          hand: [{ card: "BT1-054", as: "liamon" }],
          deck: [{ card: "BT1-010", as: "evolutionDraw" }],
        },
        1: { battleArea: [{ card: "BT1-016", as: "target", dp: 5000 }], security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("liamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("liamon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("BT1-050");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.perm("target").currentDP).toBe(3000);
  });
});
