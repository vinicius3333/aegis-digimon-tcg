import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

const cardId = "EX12-029";

describe("EX12-029 Sagomon", () => {
  it("records the catalog digivolution and DigiXros requirements", () => {
    const compiled = registeredCompiledCards.get(cardId)!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["Shambala"], cost: 3, isAlternate: true }]);
    expect(compiled.digiXrosRequirement).toEqual([
      {
        materials: [
          {
            levelMax: 5,
            nameOrTrait: [
              { tokens: ["Gokuumon"], match: "text" },
              { tokens: ["SW"], match: "trait" },
            ],
          },
        ],
        count: 2,
      },
    ]);
  });

  it("makes Alliance selection optional but makes the resulting attack mandatory (Q6761)", () => {
    const compiled = registeredCompiledCards.get(cardId)!;
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({
        kind: "Restrict",
        restriction: "suspend",
        duration: "untilOpponentTurnEnd",
        target: { count: 1, filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
      });
      expect(effect.actions[1]).toMatchObject({
        kind: "GainKeyword",
        optional: true,
        keyword: { keyword: "Alliance" },
        duration: "forTheTurn",
      });
      expect(effect.actions[2]).toMatchObject({
        kind: "Attack",
        mandatory: true,
        condition: { kind: "ifThisEffectActed" },
        target: { count: 1, sameTarget: true },
        withoutSuspending: false,
      });
    }
  });

  it("accepts a level-5-or-lower SW DigiXros material and pays the -2 reduction", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "EX12-006", as: "material" },
          ],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === cardId));

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === cardId)!;
    expect(played.stack.map((card) => card.cardId)).toEqual(["EX12-006"]);
    expect(s.state.memory).toBe(0);
  });

  it("restricts an opposing permanent and grants Alliance to an SW Digimon on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "ally" }],
          hand: [{ card: cardId, as: "source" }],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent" }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent").permanentId, "suspend"));
    await s.ready();

    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(observe(s.engine).isRestricted(s.perm("opponent").permanentId, "suspend")).toBe(true);
    expect(continuous.hasKeyword(s.perm("ally").permanentId, "Alliance")).toBe(true);
  });

  it("trashes bottom sources and restricts a source-less opposing Digimon once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-011", as: "host", under: [{ card: cardId, as: "source" }] }] },
        1: {
          battleArea: [
            { card: "BT1-011", as: "empty" },
            { card: "BT1-011", as: "stacked", under: ["BT1-001", "BT1-002", "BT1-003"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(
      () =>
        s.perm("stacked").stack.length === 1 && observe(s.engine).isRestricted(s.perm("empty").permanentId, "suspend"),
    );

    expect(s.perm("stacked").stack).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("empty").permanentId, "suspend")).toBe(true);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle();
    expect(s.perm("stacked").stack).toHaveLength(1);
  });
});
