import { EffectTiming } from "@aegis/shared";
import { expect, it } from "vitest";
import { advance } from "./testkit/advance.js";
import { setupEngine } from "./testkit/harness.js";
import "../cards/index.js";

it("EX10-010 ignores an opposing Digimon's player-wide DP reduction while another target receives it", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT23-035", as: "dynasmon" },
          { card: "BT5-082", as: "qualifier", dp: 13000 },
        ],
        security: ["BT1-009"],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: {
        battleArea: [
          { card: "EX10-010", as: "immune" },
          { card: "BT1-009", as: "ordinary", dp: 10000 },
        ],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  expect(s.perm("immune").currentDP).toBe(15000);

  // Dynasmon's actual compiled effect pays security and records a player-wide -6000.
  // Q5020/Q5023 immunity must suppress that Digimon-origin effect for BlackWarGreymon,
  // while Q5293's player-wide grant still affects an ordinary opposing Digimon.
  await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("dynasmon"));
  expect(s.perm("ordinary").currentDP).toBe(4000);
  expect(s.perm("immune").currentDP).toBe(15000);

  // The player-wide reduction is retained while immunity is active. Once the qualifying
  // 13000-DP Digimon drops below the gate, the immunity lapses and the stored reduction
  // must become visible again; the ordinary opposing Digimon remains the negative control.
  s.perm("qualifier").baseDP = 12000;
  s.perm("qualifier").currentDP = 12000;
  await s.engine.recomputeContinuousEffects();
  expect(s.perm("ordinary").currentDP).toBe(4000);
  expect(s.perm("immune").currentDP).toBe(6000);
});
