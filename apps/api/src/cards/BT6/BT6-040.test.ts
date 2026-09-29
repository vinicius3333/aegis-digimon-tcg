import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-033.js";
import "./BT6-040.js";
import "../BT13/BT13-046.js";

describe("BT6-040 Mistymon", () => {
  it("gives an opposing Digimon -2000 DP when its host removes your security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-046", under: ["BT6-040"], as: "host" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT6-016", as: "target" }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseDP = s.perm("target").baseDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === baseDP - 9000);

    expect(s.perm("target").currentDP).toBe(baseDP - 9000);
  });
});

describe("BT6-040 Mistymon — KB Q&A rulings", () => {
  it("inherited effect gives -2000 DP when your own effect trashes a security card (Q1426)", async () => {
    async function playPulsemonUnderMistymonHost(securityToTrash: number) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT6-041", under: ["BT6-040"], as: "host" }],
            hand: [{ card: "BT6-033", as: "pulsemon" }],
            security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
          },
          1: { battleArea: [{ card: "BT6-016", as: "target" }] },
        },
        { autoChooseOption: true, preferOptionIndex: securityToTrash, autoSelectCards: true },
      );
      s.state.memory = 3;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pulsemon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.security.length === 5 - securityToTrash);
      await drainMicrotasks();
      return s;
    }

    const trashedNone = await playPulsemonUnderMistymonHost(0);
    expect(trashedNone.perm("target").currentDP).toBe(trashedNone.perm("target").baseDP);

    const trashedOne = await playPulsemonUnderMistymonHost(1);
    expect(trashedOne.state.players[0]!.trash).toHaveLength(1);
    expect(trashedOne.perm("target").currentDP).toBe(trashedOne.perm("target").baseDP - 2000);
  });
});
