import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-023.js";

describe("EX8-023", () => {
  it("has Ice Clad, trashes 2 digivolution cards, and restricts a card with no digivolution cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({ keyword: "IceClad", raw: "＜Ice Clad＞" });
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 2 });
    expect(actions[1]).toMatchObject({ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" });
    expect(actions[2]).toMatchObject({ kind: "Restrict", restriction: "cannotActivateWhenDigivolving", target: { sameTarget: true } });
  });
  it("grants Piercing during your turn when no opposing Digimon has digivolution cards", () => expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Piercing" } }, while: { kind: "opponentHasNone" } }));
  it("exposes Ice Clad on live state", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-023", as: "polar" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("polar"), "IceClad")).toBe(true);
  });
});
