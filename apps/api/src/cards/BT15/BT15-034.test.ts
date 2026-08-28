import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-034.js";

describe("BT15-034", () => {
  it("moves one security card to hand or places a yellow Vaccine Digimon from hand as security", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "toHand",
      amount: 1,
      condition: { kind: "securityAtLeast", value: 3 },
      optional: true,
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      from: ["hand"],
      position: "choice",
      condition: { kind: "securityAtMost", value: 2 },
      optional: true,
    });
  });
  it("once per turn gives an opposing Digimon -2000 DP when opponent security is removed", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "opponent" },
          actions: [{ kind: "ModifyDP", amount: -2000 }],
        },
      ],
    }));

  it("at 3 security takes the top card, then may refill after the live count becomes 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-034", as: "salamon" }],
          hand: [{ card: "BT15-033", as: "vaccine" }],
          security: [
            { card: "BT1-001", as: "top" },
            { card: "BT1-002", as: "middle" },
            { card: "BT1-003", as: "bottom" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("salamon"));
    await settle(() =>
      s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("top").instanceId) &&
      s.state.players[0]!.security.length === 3,
    );

    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("middle").instanceId,
      s.inst("bottom").instanceId,
      s.inst("vaccine").instanceId,
    ]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("vaccine").instanceId);
  });

  it("at 2 security places only a yellow Vaccine Digimon at the chosen bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-034", as: "salamon" }],
          hand: [
            { card: "BT15-033", as: "yellowVaccine" },
            { card: "BT15-035", as: "nonVaccine" },
          ],
          security: [
            { card: "BT1-001", as: "top" },
            { card: "BT1-002", as: "bottom" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("salamon"));
    await settle(() => s.state.players[0]!.security.length === 3);

    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("top").instanceId,
      s.inst("bottom").instanceId,
      s.inst("yellowVaccine").instanceId,
    ]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("nonVaccine").instanceId,
    ]);
  });

  it("can instead place the yellow Vaccine at the chosen top", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-034", as: "salamon" }],
          hand: [{ card: "BT15-033", as: "yellowVaccine" }],
          security: [
            { card: "BT1-001", as: "oldTop" },
            { card: "BT1-002", as: "oldBottom" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 0 },
    );

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("salamon"));
    await settle(() => s.state.players[0]!.security.length === 3);

    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("yellowVaccine").instanceId,
      s.inst("oldTop").instanceId,
      s.inst("oldBottom").instanceId,
    ]);
  });

  it("its inherited host applies -2000 DP only once when opponent security is removed", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-035", as: "host", under: ["BT15-034"] }], security: ["BT1-001"] },
        1: {
          battleArea: [{ card: "BT15-029", as: "target", dp: 7000 }],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1);
    expect(s.perm("target").currentDP).toBe(7000);
    await advance(s.engine).verb.trashFromSecurity(1, 1);
    await settle(() => s.perm("target").currentDP === 5000);
    await advance(s.engine).verb.trashFromSecurity(1, 1);

    expect(s.perm("target").currentDP).toBe(5000);
  });
});
