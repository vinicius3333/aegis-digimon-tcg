import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-091.js";

describe("BT13-091 Belphemon: Rage Mode", () => {
  it("deletes all opposing level 5 or lower Digimon at the start of the main phase", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions?.[0]).toMatchObject({ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } }, count: "all" } });
  });

  it("conditionally grants +3000 DP and Security Attack +1 with 6 or fewer hand cards", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase");
    for (const action of effect?.actions?.slice(1) ?? []) {
      expect(action).toMatchObject({ target: { filter: { isSelfRef: true }, isSelf: true }, duration: "forTheTurn", condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 6 } });
    }
    expect(effect?.actions?.[1]).toMatchObject({ kind: "ModifyDP", amount: 3000 });
    expect(effect?.actions?.[2]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 } });
  });

  it("unsuspends once per turn by deleting another Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")?.actions?.[0]).toMatchObject({ kind: "Unsuspend", cost: { kind: "deleteOwn", target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 } }, optional: true, abortOnDecline: true });
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")).toMatchObject({ frequency: "OncePerTurn" });
  });
});
