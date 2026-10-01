import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-033.js";
import "./BT6-034.js";
import "./BT6-041.js";

describe("BT6-034 Wizardmon", () => {
  it("gains 1 memory when its host removes a card from your security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-041", under: ["BT6-031", "BT6-034"], as: "host" }],
          security: ["BT1-001"],
        },
        1: { battleArea: ["BT6-016"], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
  });
});

describe("BT6-034 Wizardmon — KB Q&A rulings", () => {
  it("inherited effect gains memory when your own effect trashes a security card (Q1425)", async () => {
    async function playPulsemonUnderWizardmonHost(securityToTrash: number) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT6-041", under: ["BT6-034"], as: "host" }],
            hand: [{ card: "BT6-033", as: "pulsemon" }],
            security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
          },
        },
        { autoChooseOption: true, preferOptionIndex: securityToTrash },
      );
      s.state.memory = 3;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pulsemon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.security.length === 5 - securityToTrash);
      await drainMicrotasks();
      return s;
    }

    const trashedNone = await playPulsemonUnderWizardmonHost(0);
    expect(trashedNone.state.memory).toBe(0);

    const trashedOne = await playPulsemonUnderWizardmonHost(1);
    expect(trashedOne.state.players[0]!.trash).toHaveLength(1);
    expect(trashedOne.state.memory).toBe(2);
  });
});
