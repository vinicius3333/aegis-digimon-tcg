import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-029.js";

describe("BT23-029 Antylamon", () => {
  it("reacts when this card itself is played and restricts one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-029", as: "antylamon" }] },
        1: { battleArea: [{ card: "BT1-024", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("antylamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving"));

    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(true);
  });

  it("inherits a once-per-turn -4000 DP reaction only when another own Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-035", as: "carrier", under: ["BT23-029"] },
            { card: "BT23-041", as: "other" },
          ],
        },
        1: { battleArea: [{ card: "BT1-024", as: "target" }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("carrier").permanentId,
    });
    expect(s.perm("target").currentDP).toBe(10000);

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("other").permanentId,
    });
    expect(s.perm("target").currentDP).toBe(6000);
  });

  it("declares Alliance", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Alliance", raw: "＜Alliance＞" }]);
  });

  it("once per turn reacts to any played Beast, Beastkin, or CS card", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: {
        controller: "mine",
        nameOrTrait: [{ tokens: ["Beast", "Beastkin", "CS"], match: "trait" }],
      },
      actions: [
        {
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          restriction: "cannotActivateWhenDigivolving",
          duration: "untilOpponentTurnEnd",
        },
      ],
    });
  });

  it("inherits the other-Digimon suspension DP reaction", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", kind: ["Digimon"], excludeSelf: true },
          actions: [{ kind: "ModifyDP", amount: -4000, duration: "forTheTurn" }],
        },
      ],
    });
  });
});
