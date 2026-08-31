import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-205.js";

describe("P-205 Insane Synthetic Monster", () => {
  it("waives its color requirement only while you have a DM Digimon or Tamer", () => {
    expect(runtimeCompiledCard("P-205")!.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      condition: {
        kind: "youHave",
        filter: { controller: "mine", kind: ["Digimon", "Tamer"], nameOrTrait: [{ tokens: ["DM"], match: "trait" }] },
      },
      actions: [{ kind: "WaiveColorRequirement", target: { isSelf: true } }],
    });
  });

  it("draws, trashes two, and places itself for Main and Security", () => {
    const card = runtimeCompiledCard("P-205")!;
    for (const effect of card.effects.filter(
      (entry) => (entry.trigger === "Main" && !entry.keywords?.length) || entry.trigger === "Security",
    )) {
      expect(effect.actions).toEqual([
        { kind: "Draw", controller: "mine", amount: 2 },
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 2 } },
        { kind: "PlaceInBattleAreaSelf" },
      ]);
    }
  });

  it("deletes your low-cost Digimon and plays a named card from your trash with cost reduced by 3", () => {
    expect(
      runtimeCompiledCard("P-205")!.effects.find((effect) =>
        effect.keywords?.some((keyword) => keyword.keyword === "Delay"),
      ),
    ).toMatchObject({
      keywords: [{ keyword: "Delay" }],
      actions: [
        { kind: "Delete", target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], playCostLte: 7 } } },
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: true,
          reduceCostBy: 3,
          target: {
            count: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Kimeramon", "Millenniummon"], match: "name" }],
            },
          },
        },
      ],
    });
  });

  it("draws two, trashes two cards, and places itself from Main", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-205", as: "option" },
            { card: "BT1-001", as: "trash1" },
            { card: "BT1-002", as: "trash2" },
          ],
          battleArea: [{ card: "BT19-065", as: "color" }],
          deck: ["BT1-003", "BT1-004"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length > 0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("trash1").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("trash2").instanceId)).toBe(true);
  });

  it("draws, trashes, and places itself from Security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "P-205", as: "option" }],
          hand: [
            { card: "BT1-001", as: "trash1" },
            { card: "BT1-002", as: "trash2" },
          ],
          deck: ["BT1-003", "BT1-004"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle();
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("option").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("activates Delay to delete a low-cost Digimon and play Millenniummon from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-205", as: "option" },
            { card: "BT1-009", as: "sacrifice" },
          ],
          trash: [{ card: "BT2-077", as: "kimeramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    const source = s.perm("option");
    const delay = (
      observe(s.engine).activatableEffects(source) as Array<{ effectKey: string; description?: string }>
    ).find((entry) => /delay/i.test(entry.description ?? ""));
    expect(delay).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: source.topCard.instanceId,
        effectKey: delay!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT2-077")).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("sacrifice").instanceId,
      ),
    ).toBe(false);
  });
});
