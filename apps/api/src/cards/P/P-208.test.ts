import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-208.js";

describe("P-208 Merukimon", () => {
  it("requires a level 5 Beastkin or TS Digimon and has Execute", () => {
    const card = runtimeCompiledCard("P-208")!;
    expect(card.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Beastkin", "TS"], cost: 3, isAlternate: true },
    ]);
    expect(card.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Execute", raw: "＜Execute＞" }],
    });
  });

  it("plays an eligible card from trash on digivolution and deletion, excluding Sea Animal", () => {
    const card = runtimeCompiledCard("P-208")!;
    for (const trigger of ["WhenDigivolving", "OnDeletion"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["trash"],
            payCost: false,
            optional: true,
            target: {
              count: 1,
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 4 },
                excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
                nameOrTrait: [
                  { tokens: ["Avian", "Bird", "Beast", "Animal", "Sovereign"], match: "trait" },
                  { tokens: ["TS"], match: "trait" },
                ],
              },
            },
          },
        ],
      });
    }
  });

  it("once per turn returns an opponent's suspended Digimon to deck bottom when attacking", () => {
    expect(runtimeCompiledCard("P-208")!.effects.find((effect) => effect.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Return",
          to: "deckBottom",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], suspended: true } },
        },
      ],
    });
  });

  it("exposes Execute on the live Merukimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-208", as: "meruki" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("meruki"), "Execute")).toBe(true);
  });

  it("plays an eligible level-4 Digimon from trash when deleted", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-208", as: "meruki" }], trash: [{ card: "BT1-013", as: "avian" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("meruki").permanentId]);
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("avian").instanceId)).toBe(true);
  });

  it("plays an eligible level-4 Digimon from trash when digivolving", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-208", as: "meruki" }], trash: [{ card: "BT1-013", as: "avian" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("meruki"));
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("avian").instanceId)).toBe(true);
  });

  it("returns a suspended opposing Digimon to the bottom of the deck after a real attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-208", as: "meruki" }] },
        1: { battleArea: [{ card: "BT1-009", suspended: true, as: "victim" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("meruki").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.some((card) => card.instanceId === s.inst("victim").instanceId)).toBe(true);
  });
});
