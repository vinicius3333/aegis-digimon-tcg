import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-178.js";

describe("P-178 Sagittarimon", () => {
  it("encodes Veemon Armor digivolution and Armor Purge", () => {
    const card = runtimeCompiledCard("P-178")!;
    expect(card.digivolutionRequirement).toEqual([{ names: ["Veemon"], cost: 2, isAlternate: true }]);
    expect(card.effects[0]).toMatchObject({ keywords: [{ keyword: "Armor Purge", raw: "＜Armor Purge＞" }] });
  });

  it("reduces an opponent by 3000 DP on digivolution and deletes an opponent at 4000 DP or less when attacking", () => {
    const card = runtimeCompiledCard("P-178")!;
    expect(card.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "ModifyDP",
          amount: -3000,
          duration: "forTheTurn",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
        },
      ],
    });
    expect(card.effects.find((effect) => effect.trigger === "WhenAttacking")).toMatchObject({
      actions: [
        {
          kind: "Delete",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } } },
        },
      ],
    });
  });

  it("exposes Armor Purge on the live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-178", as: "sagitta" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("sagitta"), "Armor Purge")).toBe(true);
  });

  it("applies the -3000 digivolution modifier and deletes only targets at the 4000 boundary", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-178", as: "sagitta" }] },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 7000, as: "four" },
            { card: "BT1-009", dp: 8000, as: "five" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("sagitta"));
    await settle();
    expect([s.perm("four").currentDP, s.perm("five").currentDP]).toContain(4000);
    expect([s.perm("four").currentDP, s.perm("five").currentDP]).toContain(8000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sagitta").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(8000);
  });
});
