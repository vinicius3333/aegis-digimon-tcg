import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-076.js";

describe("BT13-076 KingEtemon", () => {
  it("debuffs one opposing Digimon when an Etemon or Sukamon is deleted", () => {
    const watcher = compiled.effects?.find((effect) => effect.trigger === "AllTurns");
    const trigger = watcher?.actions?.[0] as { actions?: unknown[]; sourceFilter?: unknown };
    expect(trigger).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: { controllerDefault: "mine", kind: ["Digimon"] },
    });
    expect(trigger.sourceFilter).toMatchObject({ nameOrTrait: [{ match: "name", tokens: ["Etemon", "Sukamon"] }] });
    expect(trigger.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "ModifyDP", amount: -3000, duration: "untilOpponentTurnEnd" }),
      expect.objectContaining({ kind: "GainKeyword", keyword: expect.objectContaining({ keyword: "SecurityAttack", amount: -1 }), duration: "untilOpponentTurnEnd" }),
    ]));
  });

  it("grants Blocker and protects Etemon/Sukamon Digimon from returning", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn");
    expect(effect?.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "GainKeyword", keyword: expect.objectContaining({ keyword: "Blocker" }), duration: "permanent" }),
      expect.objectContaining({ kind: "Restrict", restriction: "cannotReturnToHandOrDeck", duration: "permanent" }),
    ]));
  });

  it("reduces an opposing Digimon when your Etemon is deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-076", as: "king" }, { card: "BT11-041", as: "etemon" }] }, 1: { battleArea: [{ card: "BT1-015", as: "target" }] } });
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("etemon").permanentId]);

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });
});
