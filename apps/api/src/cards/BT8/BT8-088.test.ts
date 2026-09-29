import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT12/BT12-021.js";
import "./BT8-088.js";

describe("BT8-088 Davis Motomiya & Ken Ichijoji", () => {
  it("suspends to unsuspend a Digimon that digivolves into a multicolor Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-088", as: "tamer" },
            { card: "BT8-010", as: "base", suspended: true },
            { card: "BT8-010", as: "decoy", suspended: true },
          ],
          hand: [{ card: "BT8-015", as: "evolving" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("base").isSuspended);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("decoy").isSuspended).toBe(true);
  });

  it("gains 2 memory when one Digimon is both blue and green", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-088", as: "tamer" },
          { card: "BT8-053", as: "multicolor" },
        ],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tamer"));

    expect(s.state.memory).toBe(2);
  });

  it("plays itself from a face-up Security check without memory cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT8-088", as: "securityDavisKen", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityDavisKen"));
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("securityDavisKen").instanceId,
      ),
    ).toBe(true);
  });
});

describe("BT8-088 Davis Motomiya & Ken Ichijoji — KB Q&A rulings", () => {
  async function memoryGainedAtStartOfMainPhase(digimon: string[]) {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-088", as: "tamer" }, ...digimon] },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tamer"));
    return s.state.memory;
  }

  it("gains 1 memory for each part when a blue Digimon and a green Digimon are both in play (Q1766)", async () => {
    expect(await memoryGainedAtStartOfMainPhase(["BT1-032", "BT1-069"])).toBe(2);
    expect(await memoryGainedAtStartOfMainPhase(["BT1-032"])).toBe(1);
  });

  it("gains 1 memory for each part when one Digimon is both blue and green (Q1767)", async () => {
    expect(await memoryGainedAtStartOfMainPhase(["BT8-053"])).toBe(2);
    expect(await memoryGainedAtStartOfMainPhase(["BT1-069"])).toBe(1);
  });

  it("can be added to hand by Veemon's reveal as a Tamer with [Davis Motomiya] in its name (Q2150)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-021", as: "veemon" }],
          deck: [{ card: "BT8-089", as: "cody" }, { card: "BT8-088", as: "davisKen" }, "BT1-009"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("veemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2 && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("davisKen").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("cody").instanceId);
  });
});
