import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-055.js";

describe("EX8-055", () => {
  it("has Fragment (3) and trashes 3 Mineral/Rock digivolution cards to unsuspend and gain Security Attack +1 when digivolving and attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({ keyword: "Fragment", amount: 3, raw: "＜Fragment (3)＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([{ kind: "Unsuspend", cost: { kind: "trash", target: { count: 3 } } }, { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, duration: "forTheTurn" }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({ kind: "Unsuspend", cost: { kind: "trash", target: { count: 3 } } });
  });
  it("places 1 to 3 Mineral/Rock cards from trash underneath itself at end of turn", () => expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions[0]).toMatchObject({ kind: "PlaceUnder", target: { count: 1 } }));
  it("places an exact Mineral card from trash underneath itself at end of turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-055", as: "pyramid" }], trash: ["EX8-053"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("pyramid"));

    expect(s.perm("pyramid").stack.some((card) => card.cardId === "EX8-053")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX8-053")).toBe(false);
  });
});
