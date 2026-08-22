import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX12-077.js";

describe("EX12-077 Proximamon", () => {
  it("retains the normal level 6 routes and printed keywords", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 6, texts: ["Gammamon"], cost: 5, isAlternate: true },
      { level: 6, traits: ["VB"], cost: 5, isAlternate: true },
    ]);

    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          keywords: [expect.objectContaining({ keyword: "SecurityAttack", amount: 1 })],
        }),
        expect.objectContaining({
          trigger: "Static",
          keywords: [expect.objectContaining({ keyword: "Blocker" })],
        }),
      ]),
    );
  });

  it("retains both printed DNA Digivolve routes at cost 0", () => {
    expect(compiled.dnaDigivolveRequirement).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Red", level: 6 },
          { color: "Blue", level: 6 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Black", level: 6 },
          { color: "Purple", level: 6 },
        ],
      },
    ]);
  });

  it("registers the four timing windows with one shared once-per-turn identity", () => {
    const module = getEffectModule("EX12-077");
    expect(module).toBeDefined();
    const source = {
      instanceId: "source",
      cardId: "EX12-077",
      ownerSeat: 0,
      definition: undefined,
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => false,
    } as never;

    const effects = [
      ...module!.effectsForTiming(EffectTiming.OnPlay, source),
      ...module!.effectsForTiming(EffectTiming.WhenDigivolving, source),
      ...module!.effectsForTiming(EffectTiming.OnUseAttack, source),
      ...module!.effectsForTiming(EffectTiming.OnCounterTiming, source),
    ].filter((effect) => effect.effectKey.endsWith("/ir-shared-0"));
    expect(effects).toHaveLength(4);
    expect(new Set(effects.map((effect) => effect.effectKey))).toHaveLength(1);
  });

  it("places exactly two matching cards and deletes an opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX12-077", as: "proximamon" },
            { card: "EX12-005", as: "sourceOne" },
            { card: "EX12-007", as: "sourceTwo" },
          ],
          battleArea: [{ card: "EX12-005", as: "host" }],
        },
        1: { battleArea: [{ card: "EX12-005", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("proximamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    const host = s.perm("host");
    expect(host.stack.map((card) => card.cardId)).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("sourceOne").instanceId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("sourceTwo").instanceId)).toBe(false);
  });

  it("does not pay or delete when fewer than two matching cards are available", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX12-077", as: "proximamon" },
            { card: "EX12-005", as: "source" },
          ],
          battleArea: [{ card: "EX12-005", as: "host" }],
        },
        1: { battleArea: [{ card: "EX12-005", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("proximamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX12-077"));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("host").stack).toHaveLength(0);
  });

  it("plays only a matching card costing 10 or less from a Digimon's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX12-077",
              as: "proximamon",
              under: ["EX12-035", "EX12-013"],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("proximamon"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX12-013")).toBe(true);
    expect(s.perm("proximamon").stack.map((card) => card.cardId)).toEqual(["EX12-035"]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX12-035")).toBe(false);
  });
});
