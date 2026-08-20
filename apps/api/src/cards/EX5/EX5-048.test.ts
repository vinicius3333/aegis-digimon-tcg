import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-048.js";

describe("EX5-048 Etemon", () => {
  it("reduces one opposing Digimon by 3000 and grants that same Digimon a start-of-main-phase attack effect", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions;
    expect(actions?.[0]).toMatchObject({ kind: "ModifyDP", amount: -3000, target: { bindAs: "dpTarget" } });
    expect(actions?.[1]).toMatchObject({ kind: "GainEffect", target: { fromSelectionRef: "dpTarget" }, grant: { trigger: "StartOfYourMainPhase", actions: [{ kind: "Attack" }] } });
  });
  it("inherits a once-per-turn reveal-three play of a black or yellow low-cost Digimon when an opponent attacks", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")).toMatchObject({ isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RevealAdd", revealCount: 3 }] }] });
  });
});
