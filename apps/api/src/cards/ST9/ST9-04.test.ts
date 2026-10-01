import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST9-04.js";

describe("ST9-04 ExVeemon", () => {
  it("reduces its play cost by 1 while you have a green Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT1-064"], hand: [{ card: "ST9-04", as: "exveemon" }] } });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("exveemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(1);
  });

  it("pays its full play cost without a green Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST9-04", as: "exveemon" }] } });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("exveemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(0);
  });

  it("gives +1000 DP when the inherited host is itself green", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST9-11", as: "host", under: ["ST9-04"] }] },
      1: { security: ["BT1-010"] },
    });

    expect(s.perm("host").currentDP).toBe(8000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === 9000);

    expect(s.perm("host").currentDP).toBe(9000);
  });
});

describe("ST9-04 ExVeemon — KB Q&A rulings", () => {
  async function attackWithHost(hostCardId: string): Promise<number> {
    const s = setupEngine({
      0: { battleArea: [{ card: hostCardId, as: "host", under: ["ST9-04"] }] },
      1: { security: ["BT1-010"] },
    });
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking &&
        s.state.players[1]!.security.length === 0,
    );
    return s.perm("host").currentDP - s.perm("host").baseDP;
  }

  it("gives +1000 DP when attacking if the host itself is the only green Digimon in play (Q708)", async () => {
    expect(await attackWithHost("ST9-09")).toBe(1000);
    expect(await attackWithHost("BT1-009")).toBe(0);
  });
});
