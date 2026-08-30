import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-040.js";

describe("BT15-040", () => {
  it("may play a Numemon or level 3 Digimon when the stack has Monzaemon/X Antibody", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          condition: { kind: "selfDigivolutionStackHasTrait" },
          optional: true,
        },
      ],
    }));
  it("once per turn gives an opposing Digimon -2000 DP when another Digimon is played, scaled by your Digimon count", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          actions: [{ kind: "ModifyDP", amount: -2000, scaling: { per: 1, unit: "cards" } }],
        },
      ],
    }));

  it("debuffs exactly one opponent by -2000 for each of your Digimon when another Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-040", as: "monzaemon" }],
          hand: [{ card: "BT1-009", as: "other" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 7000, as: "chosen" },
            { card: "BT1-009", dp: 7000, as: "unchosen" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("other").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("chosen").currentDP === 3000, 1_500);

    expect(s.perm("chosen").currentDP).toBe(3000);
    expect(s.perm("unchosen").currentDP).toBe(7000);
  });
});
