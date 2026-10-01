import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-089.js";

describe("BT8-089 Cody Hida", () => {
  it("suspends when a multicolor Digimon attacks to give an opposing Digimon -2000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-089", as: "cody" },
            { card: "BT8-015", as: "attacker" },
          ],
        },
        1: { security: ["BT8-034"], battleArea: [{ card: "BT8-017", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const before = s.perm("target").currentDP;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP < before);
    expect(s.perm("cody").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBe(before - 2000);
  });

  it("does not count colors that exist only on the attacking Digimon's evolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-089", as: "cody" },
            { card: "BT1-015", as: "attacker", under: ["BT10-059"] },
          ],
        },
        1: { security: ["BT8-034"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));

    expect(s.perm("cody").isSuspended).toBe(false);
  });

  it("gains 1 memory at the start of its main phase when a yellow Digimon is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-089", as: "cody" },
          { card: "BT8-034", as: "yellow" },
        ],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("cody"));
    expect(s.state.memory).toBe(1);
  });

  it("plays itself from a face-up Security check without memory cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT8-089", as: "securityCody", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityCody"));
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("securityCody").instanceId,
      ),
    ).toBe(true);
  });
});

describe("BT8-089 Cody Hida — KB Q&A rulings", () => {
  it("counts only the attacking Digimon's own colors, not its digivolution cards' colors (Q1768)", async () => {
    async function codyReaction(attacker: { card: string; under?: string[] }) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT8-089", as: "cody" },
              { ...attacker, as: "attacker" },
            ],
          },
          1: { security: ["BT8-034"], battleArea: [{ card: "BT8-017", as: "target" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 3;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "securityChecked"));

      return {
        codySuspended: s.perm("cody").isSuspended,
        targetDPLoss: s.perm("target").baseDP - s.perm("target").currentDP,
      };
    }

    expect(await codyReaction({ card: "BT1-015", under: ["BT10-059"] })).toEqual({
      codySuspended: false,
      targetDPLoss: 0,
    });
    expect(await codyReaction({ card: "BT8-015" })).toEqual({ codySuspended: true, targetDPLoss: 2000 });
  });
});
