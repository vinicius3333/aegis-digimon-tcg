import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-076.js";

describe("BT13-076 KingEtemon", () => {
  it("debuffs one opposing Digimon when an Etemon or Sukamon is deleted", () => {
    const watcher = compiled.effects?.find((effect) => effect.trigger === "AllTurns");
    const trigger = watcher?.actions?.[0] as { actions?: unknown[]; sourceFilter?: unknown };
    expect(trigger).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: { controller: "any", kind: ["Digimon"], excludeSelf: true },
    });
    expect(trigger.sourceFilter).toMatchObject({ nameOrTrait: [{ match: "name", tokens: ["Etemon", "Sukamon"] }] });
    expect(trigger.actions).toEqual([
      {
        kind: "ModifyDP",
        target: { filter: { controller: "opponent", kind: ["Digimon"], excludeLeavingSubject: true }, count: 1 },
        amount: -3000,
        duration: "untilOpponentTurnEnd",
      },
      {
        kind: "GainKeyword",
        target: { filter: { controller: "opponent", kind: ["Digimon"], excludeLeavingSubject: true }, count: 1 },
        keyword: { keyword: "SecurityAttack", amount: -1, raw: "＜Security Attack -1＞" },
        duration: "untilOpponentTurnEnd",
      },
    ]);
    expect(watcher).toMatchObject({ frequency: "OncePerTurn" });
  });

  it("grants Blocker and protects Etemon/Sukamon Digimon from returning", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn");
    expect(effect?.actions).toEqual([
      {
        kind: "GainKeyword",
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ match: "name", tokens: ["Etemon", "Sukamon"] }],
          },
          count: "all",
        },
        keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
        duration: "permanent",
      },
      {
        kind: "Restrict",
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ match: "name", tokens: ["Etemon", "Sukamon"] }],
          },
          count: "all",
        },
        restriction: "cannotReturnToHandOrDeck",
        duration: "permanent",
      },
    ]);
  });

  it("grants every matching own Digimon Blocker and return protection only during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-076", as: "king" },
          { card: "BT11-041", as: "etemon" },
          { card: "BT11-040", as: "sukamon" },
          { card: "BT11-042", as: "nonmatching" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    for (const alias of ["etemon", "sukamon"]) {
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Blocker")).toBe(true);
      expect(observe(s.engine).isRestricted(s.perm(alias), "cannotReturnToHandOrDeck")).toBe(true);
    }
    expect(observe(s.engine).hasKeyword(s.perm("nonmatching"), "Blocker")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("nonmatching"), "cannotReturnToHandOrDeck")).toBe(false);

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    for (const alias of ["etemon", "sukamon"]) {
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Blocker")).toBe(false);
      expect(observe(s.engine).isRestricted(s.perm(alias), "cannotReturnToHandOrDeck")).toBe(false);
    }
  });

  it("reduces an opposing Digimon when your Etemon is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-076", as: "king" },
          { card: "BT11-041", as: "etemon" },
        ],
      },
      1: { battleArea: [{ card: "BT1-015", as: "target", dp: 9000 }] },
    });
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("etemon").permanentId]);

    expect(s.perm("target").currentDP).toBe(6000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it("also triggers when an opponent's Etemon is deleted (Q2314)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-076", as: "king" }] },
        1: { battleArea: [{ card: "BT11-041", as: "etemon" }, { card: "BT1-015", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("etemon").permanentId]);
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === -1);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });
});
