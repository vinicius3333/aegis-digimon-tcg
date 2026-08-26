import { describe, expect, it } from "vitest";
import { appFusionCostFor, assemblyRequirementFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-028.js";
import "../index.js";

describe("BT26-028 Medicmon", () => {
  it("preserves App Fusion, Assembly, link windows, and linked-face behavior", () => {
    for (const [topName, linkedName] of [
      ["Aidmon", "Supplemon"],
      ["Aidmon", "Spamon"],
      ["Supplemon", "Aidmon"],
      ["Supplemon", "Spamon"],
      ["Spamon", "Aidmon"],
      ["Spamon", "Supplemon"],
    ] as const) {
      expect(appFusionCostFor("BT26-028", { topName, linkedNames: [linkedName] })).toBe(0);
    }
    expect(appFusionCostFor("BT26-028", { topName: "Aidmon", linkedNames: ["Aidmon"] })).toBeUndefined();
    expect(appFusionCostFor("BT26-028", { topName: "Aidmon", linkedNames: ["Roleplaymon"] })).toBeUndefined();
    expect(assemblyRequirementFor("BT26-028")).toEqual([
      {
        reduceCost: 2,
        materials: [{ kinds: ["Digimon"], traits: ["Life", "System", "Seven Code"], level: 3, count: 1 }],
      },
    ]);
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Aidmon", "Supplemon", "Spamon"], cost: 0 }]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          keywords: expect.arrayContaining([
            { keyword: "Barrier", raw: "＜Barrier＞" },
            { keyword: "Detach", raw: "＜Detach ([Seven Code] trait)＞" },
          ]),
        }),
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [
            expect.objectContaining({
              kind: "Link",
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
              target: expect.objectContaining({
                filter: expect.objectContaining({ hostFilter: { isSelfRef: true } }),
              }),
            }),
          ],
        }),
        expect.objectContaining({ trigger: "WhenDigivolving" }),
        expect.objectContaining({
          trigger: "Static",
          isLinked: true,
          actions: [
            {
              kind: "SubTrigger",
              event: "whenLinked",
              sourceFilter: { isSelfRef: true },
              actions: [
                expect.objectContaining({
                  kind: "SelectBind",
                  target: expect.objectContaining({ bindAs: "medicmonLinkedTarget" }),
                }),
                expect.objectContaining({
                  kind: "Restrict",
                  target: { fromSelectionRef: "medicmonLinkedTarget" },
                  restriction: "cannotActivateWhenDigivolving",
                  duration: "untilOpponentTurnEnd",
                }),
                expect.objectContaining({
                  kind: "ModifyDP",
                  target: { fromSelectionRef: "medicmonLinkedTarget" },
                  amount: -3000,
                  duration: "untilOpponentTurnEnd",
                }),
              ],
            },
          ],
        }),
      ]),
    );
  });

  it("assembles with exactly one level-3 Life/System/Seven Code card and rejects a near-miss", async () => {
    const legal = setupEngine({
      0: {
        hand: [{ card: "BT26-028", as: "medicmon" }],
        trash: [
          { card: "BT26-019", as: "sevenCode" },
          { card: "BT1-009", as: "unrelated" },
        ],
      },
    });
    legal.state.memory = 3;

    expect(
      legal.engine.applyIntent(0, {
        type: "playCard",
        instanceId: legal.inst("medicmon").instanceId,
        assembly: { materialInstanceIds: [legal.inst("sevenCode").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => legal.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-028"));

    expect(legal.state.memory).toBe(0);
    expect(legal.perm("medicmon").stack.map(({ instanceId }) => instanceId)).toContain(
      legal.inst("sevenCode").instanceId,
    );
    expect(legal.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      legal.inst("unrelated").instanceId,
    );

    const illegal = setupEngine({
      0: {
        hand: [{ card: "BT26-028", as: "medicmon" }],
        trash: [{ card: "BT1-009", as: "unrelated" }],
      },
    });
    illegal.state.memory = 3;
    expect(
      illegal.engine.applyIntent(0, {
        type: "playCard",
        instanceId: illegal.inst("medicmon").instanceId,
        assembly: { materialInstanceIds: [illegal.inst("unrelated").instanceId] },
      } as never),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(illegal.state.memory).toBe(3);
  });

  it("links a legal level-3 Link source without activating Medicmon's own link face", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-028", as: "medicmon", under: ["BT26-084"] }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", dp: 7000 },
            { card: "BT1-010", as: "second", dp: 7000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("medicmon"));

    expect(s.perm("medicmon").linked.map((card) => card.cardId)).toEqual(["BT26-084"]);
    expect(s.perm("first").currentDP).toBe(7000);
    expect(s.perm("second").currentDP).toBe(7000);
    expect(observe(s.engine).isRestricted(s.perm("first"), "cannotActivateWhenDigivolving")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("second"), "cannotActivateWhenDigivolving")).toBe(false);
  });

  it("only links from Medicmon's own digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-028", as: "medicmon", under: ["BT1-009"] },
            { card: "BT21-009", as: "otherHost", under: ["BT26-084"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("medicmon"));

    expect(s.perm("medicmon").linked).toHaveLength(0);
    expect(s.perm("otherHost").stack.map((card) => card.cardId)).toEqual(["BT26-084"]);
  });

  it("may decline linking without moving the eligible source", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT26-028", as: "medicmon", under: ["BT26-084"] }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("medicmon"));

    expect(s.perm("medicmon").linked).toHaveLength(0);
    expect(s.perm("medicmon").stack.map((card) => card.cardId)).toEqual(["BT26-084"]);
  });

  it("does not link a level-3 digivolution card without the required trait or Link text", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT26-028", as: "medicmon", under: ["BT1-009"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("medicmon"));

    expect(s.perm("medicmon").linked).toHaveLength(0);
    expect(s.perm("medicmon").stack.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("when digivolving links a legal source from the evolved stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-025", as: "base", under: [{ card: "BT26-084", as: "linkSource" }] }],
          hand: [{ card: "BT26-028", as: "medicmon" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("medicmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").linked.length === 1);

    expect(s.perm("base").topCard.cardId).toBe("BT26-028");
    expect(s.perm("base").linked.map((card) => card.instanceId)).toContain(s.inst("linkSource").instanceId);
    expect(s.perm("target").currentDP).toBe(7000);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(false);
  });

  it("applies both link-face debuffs when Medicmon itself is linked", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-009", as: "host" }], hand: [{ card: "BT26-028", as: "medicmon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 7000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("medicmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);

    expect(s.perm("target").currentDP).toBe(4000);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(true);

    advance(s.engine).ledgers.modifiers.sweep(s.state, "eachTurnEnd", 1);
    advance(s.engine).ledgers.continuous.sweep(s.state, "eachTurnEnd", 1);
    expect(s.perm("target").currentDP).toBe(7000);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(false);
  });

  it("suppresses only When Digivolving and preserves a shared once-per-turn effect for When Attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-009", as: "host" },
            { card: "BT1-009", as: "victim", dp: 1000 },
          ],
          hand: [{ card: "BT26-028", as: "medicmon" }],
        },
        1: {
          battleArea: [{ card: "BT24-061", as: "tsBase" }],
          hand: [{ card: "BT26-016", as: "holy" }],
          deck: [
            { card: "BT1-010", as: "evolutionDraw" },
            { card: "BT1-011", as: "recovery" },
          ],
          trash: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("medicmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("tsBase"), "cannotActivateWhenDigivolving"));

    s.state.turnSeat = 1;
    s.state.memory = -3;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("holy").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard.cardId === "BT26-016");

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("victim").permanentId,
    );
    expect(s.state.players[1]!.trash).toHaveLength(3);
    expect(s.state.players[1]!.security).toHaveLength(0);

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("tsBase"));
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("victim").permanentId,
    );
    expect(s.state.players[1]!.trash).toHaveLength(3);

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("tsBase"));
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).not.toContain("BT21-009");
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.security[0]).toMatchObject({ cardId: "BT1-011", faceUp: false });
  });

  it("publishes Barrier and Detach while Medicmon is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-028", as: "medicmon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("medicmon"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("medicmon"), "Detach")).toBe(true);
  });
});
