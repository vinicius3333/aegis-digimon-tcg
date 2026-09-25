import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-014.js";

describe("EX6-014 Huankunmon", () => {
  it("plays a blue level 3 card from a blue Digimon's stack on play or digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["digivolutionCards"],
        payCost: false,
        optional: true,
        target: { filter: { controller: "mine", colors: ["Blue"], levels: [3], hostFilter: { colors: ["Blue"] } } },
      });
    }
  });
  it("inherits a once-per-turn blue Digimon placement cost to unsuspend", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          optional: true,
          cost: {
            kind: "place",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            targetIsPermanent: true,
          },
        },
      ],
    });
  });

  it("publicly plays a blue level-3 card from its blue stack host", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-014", as: "huan", under: [{ card: "BT1-027", as: "source" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("huan"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("source").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("source").instanceId),
    ).toBe(true);
  });

  it("publicly plays itself for 8 and then plays a level-3 blue card from another blue stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-013", as: "host", under: [{ card: "BT1-027", as: "source" }] }],
          hand: [{ card: "EX6-014", as: "huan" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const sourceId = s.inst("source").instanceId;
    const hostId = s.perm("host").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("huan").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === sourceId));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").topCard?.cardId).toBe("EX6-013");
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(
      expect.arrayContaining(["EX6-013", "EX6-014", "BT1-027"]),
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === sourceId)).toBe(true);
  });

  it("publicly places another blue Digimon under the host to unsuspend it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-015", as: "host", under: ["EX6-012", "EX6-013", "EX6-014"] },
            { card: "BT12-021", as: "other" },
          ],
        },
        1: { deck: Array(10).fill("BT1-009"), security: Array(5).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("other").instanceId)).toBe(true);
  });

  it("publicly plays its blue level-3 source when digivolving from a blue level-4 stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-013", as: "host", under: [{ card: "EX6-012", as: "source" }] }],
          hand: [{ card: "EX6-014", as: "huan" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("huan").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("source").instanceId),
    );

    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("huan").instanceId)).toBe(false);
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("source").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("huan").instanceId)).toBe(
      true,
    );
    expect(s.perm("host").topCard?.instanceId).toBe(s.inst("huan").instanceId);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX6-013"]);
  });
});
