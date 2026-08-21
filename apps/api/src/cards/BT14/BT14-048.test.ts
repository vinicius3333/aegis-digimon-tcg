import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-048.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-048", () => {
  it("may digivolve into a level-six Leomon from hand for six when attacking a higher-DP Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({ kind: "Digivolve", payCost: true, from: ["hand"], costOverride: 6, ignoreRequirements: true, condition: { kind: "lastTargetDpGreaterThanSelf" }, into: { levels: [6], nameOrTrait: [{ tokens: ["Leomon"], match: "name" }] } }));
  it("inherits +2000 DP for Leomon", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ actions: [{ kind: "Aura", effect: { amount: 2000 }, while: { kind: "selfHasNameContaining" } }] }));
  it("digivolves after attacking a higher-DP Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT14-048", as: "attacker" }], hand: [{ card: "BT14-054", as: "evo" }] }, 1: { battleArea: [{ card: "BT14-044", as: "target", dp: 10000, suspended: true }] } }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "permanent", permanentId: s.perm("target").permanentId } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-054"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-054")).toBe(true);
  });
});
