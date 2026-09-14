import { expect, it } from "vitest";
import { securityCardEffects } from "./securityCardEffects";

it.each(["BT19-045", "BT18-044"])("shows the standing DP aura of %s with its Royal Base restriction", (cardId) => {
  expect(securityCardEffects(cardId)).toEqual([
    {
      badge: "+1000 DP",
      text: "[All Turns] All of your [Royal Base] trait Digimon get +1000 DP.",
    },
  ]);
});

it("keeps the turn and once-per-turn conditions, excluding Royal Base's checked-card effect", () => {
  const effects = securityCardEffects("P-181");
  expect(effects).toHaveLength(1);
  expect(effects[0]?.badge).toBe("Evo −1");
  expect(effects[0]?.text).toContain("[Your Turn] [Once Per Turn]");
  expect(effects[0]?.text).not.toContain("without paying");
});

it("shows a granted keyword without claiming that it is active outside the printed turn", () => {
  const effects = securityCardEffects("EX11-025");
  expect(effects[0]?.badge).toBe("Reboot");
  expect(effects[0]?.text).toContain("[Opponent's Turn]");
});

it("does not show checked-card effects or inherited bonuses as standing security buffs", () => {
  expect(securityCardEffects("BT1-010")).toEqual([]);
  expect(securityCardEffects("unknown")).toEqual([]);
});
