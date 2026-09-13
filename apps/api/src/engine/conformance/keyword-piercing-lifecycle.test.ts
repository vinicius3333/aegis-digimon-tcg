import { beforeEach, describe, expect, it } from "vitest";
import { cite } from "./_kb.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";

describe("bounded Piercing lifecycle", () => {
  beforeEach(() =>
    cite(
      "comprehensive-0225",
      "§16-7 Piercing qualification, survival, mandatory security timing, and attack limit",
      "f4d39e19988d50be36db0a6be32a7b3c639428df9116ff194f4a878181cc6cf5",
    ),
  );
  it("performs exactly one security check when native Piercing wins and deletes in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-026", as: "attacker" }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "defender", suspended: true }],
        security: [{ card: "BT1-010", as: "checked" }],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("attacker"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("checked").instanceId);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("attacker").permanentId,
    );
  });

  it("does not check security for a winning attacker without Piercing", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-025", as: "attacker" }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "defender", suspended: true }],
        security: [{ card: "BT1-010", as: "safe" }],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("attacker"))).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("safe").instanceId]);
  });

  it("does not check security when native Piercing loses the battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-026", as: "attacker" }] },
      1: {
        battleArea: [{ card: "BT1-025", as: "defender", suspended: true }],
        security: [{ card: "BT1-010", as: "safe" }],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("attacker").permanentId),
    );
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("safe").instanceId]);
  });

  it("does not check security when equal native Piercing attackers tie and both leave play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-026", as: "attacker" }] },
      1: {
        battleArea: [{ card: "BT1-026", as: "defender", suspended: true }],
        security: [{ card: "BT1-010", as: "safe" }],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("safe").instanceId]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("defender").instanceId);
  });

  it("uses a public evolution grant to give an ally Piercing, then checks exactly one security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-017", as: "jesmon" },
            { card: "BT20-084", as: "ally" },
          ],
          hand: [{ card: "BT20-019", as: "xAntibody" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "defender", suspended: true }],
          security: [{ card: "BT1-010", as: "checked" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("jesmon").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("jesmon").topCard?.cardId === "BT20-019");
    expect(observe(s.engine).hasPierce(s.perm("ally"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("checked").instanceId);
  });
});
