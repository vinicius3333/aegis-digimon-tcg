import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST9-09.js";

describe("ST9-09 Stingmon", () => {
  it("reduces its play cost by 1 while you have a blue Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT1-027"], hand: [{ card: "ST9-09", as: "stingmon" }] } });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("stingmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(1);
  });

  it("pays its full play cost without a blue Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST9-09", as: "stingmon" }] } });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("stingmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(0);
  });

  it("draws when the inherited host is itself blue", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST9-05", as: "host", under: ["ST9-09"] }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
      1: { security: ["BT1-010"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});

describe("ST9-09 Stingmon — KB Q&A rulings", () => {
  async function attackWithStingmonUnder(hostCardId: string) {
    const s = setupEngine({
      0: {
        battleArea: [{ card: hostCardId, as: "host", under: ["ST9-09"] }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
      1: { security: ["BT1-010"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 3000);
    return s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId);
  }

  it("draws when the Digimon holding it is itself the only blue Digimon (Q715)", async () => {
    expect(await attackWithStingmonUnder("ST9-04")).toBe(true);
    expect(await attackWithStingmonUnder("ST9-12")).toBe(false);
  });
});
