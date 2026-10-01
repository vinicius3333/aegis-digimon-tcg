import { EffectTiming, requireCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT9/BT9-018.js";
import "./BT6-103.js";

describe("BT6-103 Blasted Disaster", () => {
  it("suspends all opponent Digimon and gains 1 memory for each suspended opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT6-045"], hand: [{ card: "BT6-103", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT6-046", as: "first" },
            { card: "BT6-047", as: "second", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const initialMemory = 10;
    const expectedMemory = initialMemory - requireCardDefinition("BT6-103").playCost + 2;
    s.state.memory = initialMemory;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === expectedMemory);

    expect(s.perm("second").isSuspended).toBe(true);
    expect(s.state.memory).toBe(expectedMemory);
  });

  it("suspends 1 opponent Digimon from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT6-103", as: "securityOption", faceUp: true }] },
        1: { battleArea: [{ card: "BT6-046", as: "target" }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.perm("target").isSuspended).toBe(true);
  });
});

describe("BT6-103 Blasted Disaster — KB Q&A rulings", () => {
  it("lets [BT9-018 Dinorexmon] delete both 6000-DP-or-less Digimon it suspends simultaneously (Q1820)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT6-045", { card: "BT9-018", as: "dinorexmon" }],
          hand: [{ card: "BT6-103", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "first" },
            { card: "BT1-031", as: "second" },
            { card: "BT1-024", as: "large" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const largeId = s.perm("large").permanentId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([largeId]);
    expect(s.perm("large").isSuspended).toBe(true);
  });
});
