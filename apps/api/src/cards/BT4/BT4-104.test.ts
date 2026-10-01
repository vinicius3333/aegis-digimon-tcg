import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-104.js";
import "./BT4-097.js";

async function playBlindingRayBesideKari(securityCardIds: string[]) {
  const s = setupEngine(
    {
      0: {
        battleArea: ["BT4-044", { card: "BT4-097", as: "kari" }],
        security: securityCardIds,
        hand: [{ card: "BT4-104", as: "option" }],
      },
    },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  s.state.memory = 1;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.memory >= 3 && s.state.pendingDecision === undefined);
  await settle();
  return s;
}
describe("BT4-104 Blinding Ray", () => {
  it("trashes security and gains two memory", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT4-044"], security: ["BT4-033"], hand: [{ card: "BT4-104", as: "option" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 1;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 0 && s.state.memory === 3);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(3);
  });

  it("gains two memory even with an empty security stack", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT4-044"], hand: [{ card: "BT4-104", as: "option" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 1;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 3);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});

describe("BT4-104 Blinding Ray — KB Q&A rulings", () => {
  it("trashing own security with Blinding Ray activates Kari Kamiya's security-removal effect (Q1252)", async () => {
    const s = await playBlindingRayBesideKari(["BT4-033"]);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("kari").isSuspended).toBe(true);
    expect(s.state.memory).toBe(4);

    const control = await playBlindingRayBesideKari([]);
    expect(control.perm("kari").isSuspended).toBe(false);
    expect(control.state.memory).toBe(3);
  });

  it("gains 2 memory even when the security stack is already empty (Q1268)", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT4-044"], hand: [{ card: "BT4-104", as: "option" }], deck: ["BT1-009"] } },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 2);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT4-104"]);
  });
});
