import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT5-070.js";
import "../BT14/BT14-062.js";
describe("BT5-070 MetalGarurumon", () => {
  it("Digi-Bursts 2 to delete a play-cost-6 Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-013",
              under: [
                { card: "BT1-010", as: "sourceA" },
                { card: "BT1-019", as: "sourceB" },
              ],
              as: "base",
            },
          ],
          hand: [{ card: "BT5-070", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT1-019", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    const player = s.state.players[0] as PlayerState;
    const opponent = s.state.players[1] as PlayerState;
    expect(opponent.trash.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(true);
    expect(player.trash.some((card) => card.instanceId === s.inst("sourceA").instanceId)).toBe(true);
    expect(player.trash.some((card) => card.instanceId === s.inst("sourceB").instanceId)).toBe(true);
    expect(s.perm("base").stack).toHaveLength(1);
    expect(s.perm("base").stack[0]?.cardId).toBe("BT10-013");
  });
  it("trashes top security when no Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-013", under: ["BT1-010"], as: "base" }],
          hand: [{ card: "BT5-070", as: "evolving" }],
        },
        1: { security: [{ card: "BT1-011", as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const opp = s.state.players[1] as PlayerState;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => opp.security.length === 0);
    expect(opp.trash.some((c) => c.instanceId === s.inst("security").instanceId)).toBe(true);
  });
  it("does not delete a Digimon above play cost 6", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-013", under: ["BT1-010"], as: "base" }],
          hand: [{ card: "BT5-070", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT5-069", as: "expensive" }], security: [{ card: "BT1-011", as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const opp = s.state.players[1] as PlayerState;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => opp.security.length === 0);
    expect(s.perm("expensive")).toBeDefined();
    expect(opp.trash.some((c) => c.instanceId === s.inst("security").instanceId)).toBe(true);
  });

  it("may decline Digi-Burst without deleting or trashing security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-013", under: ["BT1-010", "BT1-019"], as: "base" }],
          hand: [{ card: "BT5-070", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT1-019", as: "target" }], security: [{ card: "BT1-011", as: "security" }] },
      },
      { autoDeclineOptional: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 0 && s.state.players[1]!.battleArea.length === 1);
    expect(opponent.battleArea).toHaveLength(1);
    expect(opponent.security).toHaveLength(1);
    expect(s.perm("base").stack).toHaveLength(3);
  });

  it("can choose a deletion-immune cost-6 Digimon and then trash security", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-013", under: ["BT1-010", "BT1-019"], as: "base" }],
          hand: [{ card: "BT5-070", as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: "BT14-062", as: "protected" },
            { card: "BT1-019", as: "unprotected" },
          ],
          security: [{ card: "BT1-011", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("protected").topCard!.instanceId);
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.security.length === 0);
    expect(opponent.battleArea).toHaveLength(2);
    expect(s.perm("protected").topCard?.cardId).toBe("BT14-062");
    expect(opponent.trash.some((card) => card.instanceId === s.inst("security").instanceId)).toBe(true);
  });

  it("publishes Reboot and unsuspends during the opponent's unsuspend phase", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-070", as: "metalGarurumon", suspended: true }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("metalGarurumon"), "Reboot")).toBe(true);

    const unsuspendedIds = await (
      s.engine as unknown as { unsuspendForActivePhase(seat: 1): Promise<string[]> }
    ).unsuspendForActivePhase(1);

    expect(s.perm("metalGarurumon").isSuspended).toBe(false);
    expect(unsuspendedIds).toContain(s.perm("metalGarurumon").permanentId);
  });
});
