import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-013.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-013 MagnaKidmon", () => {
  it("uses a Three Musketeers Option from hand without cost and draws until six on play/digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions).toMatchObject([{ kind: "UseOptionWithoutCost", from: ["hand"], payCost: false, optional: true }, { kind: "Draw", amount: 1, untilHandSize: 6 }]);
  });
  it("can gain Security Attack +1 by trashing an Option stack card then attacks once per turn", () => expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, cost: { kind: "trash", target: { filter: { zone: "digivolutionCards" } } } }, { kind: "Attack", optional: false }] }));

  it("draws to six after declining the optional Option use on play", async () => {
    const s = setupEngine({ 0: { hand: ["BT1-009"], deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"], battleArea: [{ card: "EX7-013", as: "magna" }] } }, { autoDeclineOptional: true });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("magna"));
    await settle(() => s.state.players[0].hand.length === 6);
    expect(s.state.players[0].hand).toHaveLength(6);
  });
});
