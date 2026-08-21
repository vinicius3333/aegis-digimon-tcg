import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-021.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-021 CrysPaledramon", () => {
  it("has Ice Clad, trashes two evolution cards, and unsuspends if the opponent has no stacked Digimon", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("IceClad");
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([{ kind: "TrashDigivolution", amount: 2, scope: "acrossDigimon", target: { filter: { controller: "opponent" } } }, { kind: "Unsuspend", condition: { kind: "opponentHasNone" } }]);
  });
  it("grants Piercing and Security Attack +1 to Ice-Snow while the opponent has no stacked Digimon", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions).toMatchObject([{ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Piercing" } }, target: { filter: { nameOrTrait: [{ tokens: ["Ice-Snow"] }] } } }, { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } } }]));

  it("trashes two opposing evolution cards across any stacks when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX7-021", as: "crys" }] }, 1: { battleArea: [{ card: "BT1-009", under: ["BT1-010"] }, { card: "BT1-011", under: ["BT1-012"] }] } }, { autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("crys"));
    await settle(() => s.state.players[1].battleArea.every((permanent) => permanent.stack.length === 0));
    expect(s.state.players[1].battleArea.every((permanent) => permanent.stack.length === 0)).toBe(true);
  });
});
