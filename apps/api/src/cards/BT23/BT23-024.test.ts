import { appFusionCostFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-024.js";

describe("BT23-024 Poseidomon", () => {
  it("declares Evade and Link +1", () => {
    expect(getCardDefinition("BT23-024")).toMatchObject({
      cardId: "BT23-024",
      nameEn: "Poseidomon",
      colors: ["Blue", "White"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Blue", level: 5, memoryCost: 4 }],
      forms: ["God", "Appmon"],
      attributes: ["God"],
      types: ["Invincible"],
    });
    const keywords = compiled.effects.flatMap(
      (entry) => entry.actions?.filter((action: any) => action.kind === "GainKeyword") ?? [],
    );
    expect(keywords).toEqual([
      expect.objectContaining({ keyword: { keyword: "Evade", raw: "＜Evade＞" }, duration: "permanent" }),
      expect.objectContaining({ keyword: { keyword: "Link", amount: 1, raw: "＜Link +1＞" }, duration: "permanent" }),
    ]);
  });

  it("may link an Appmon from hand or its digivolution cards when digivolving or attacking", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Link",
        target: {
          filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
          count: 1,
        },
        payCost: false,
        optional: true,
      });
    }
  });

  it("once per turn reacts only when this Digimon gets linked", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "ArmSuspendRestriction",
          duration: "untilOpponentTurnEnd",
          cost: { kind: "unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Oujamon", "Beautymon"], cost: 0 }]);
    expect(appFusionCostFor("BT23-024", { topName: "Oujamon", linkedNames: ["Beautymon"] })).toBe(0);
    expect(appFusionCostFor("BT23-024", { topName: "Beautymon", linkedNames: ["Oujamon"] })).toBe(0);
  });

  it("pays the unsuspend cost and dynamically exempts only the highest play-cost Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-024", as: "poseidomon", suspended: true }],
          hand: [{ card: "BT23-007", as: "link" }],
        },
        1: {
          battleArea: [
            { card: "BT23-016", as: "lower" },
            { card: "BT23-022", as: "highest" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("poseidomon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("poseidomon").isSuspended);
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("lower"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("highest"), "suspend")).toBe(false);
  });

  it("cannot arm the restriction when already unsuspended, because the cost is unpayable", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-024", as: "poseidomon" }], hand: [{ card: "BT23-007", as: "link" }] },
        1: {
          battleArea: [
            { card: "BT23-016", as: "lower" },
            { card: "BT23-022", as: "highest" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("poseidomon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle();
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("lower"), "suspend")).toBe(false);
  });
});
