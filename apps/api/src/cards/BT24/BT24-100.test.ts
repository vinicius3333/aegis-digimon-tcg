import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { effectsOf } from "../../engine/effects/collect.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_100 } from "./BT24-100.js";
import "../index.js";

describe("BT24-100 In-Between Theater", () => {
  it("waives color requirements and reveals TS before entering the battle area", () => {
    expect(BT24_100.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon", "Tamer"],
          nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
        },
      },
    });
    const main = BT24_100.effects?.find(
      (entry) => entry.trigger === "Main" && entry.actions?.[0]?.kind === "RevealAdd",
    );
    expect(main?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [
        {
          filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
          count: 1,
          to: "hand",
        },
      ],
    });
    expect(main?.actions?.[1]).toMatchObject({ kind: "PlaceInBattleAreaSelf" });
    const delay = BT24_100.effects?.find(
      (entry) => entry.trigger === "Main" && entry.keywords?.some((k) => k.keyword === "Delay"),
    );
    expect(delay?.actions?.[0]).toMatchObject({ kind: "GainMemory", amount: 2 });
    expect(BT24_100.effects?.find((entry) => entry.trigger === "Security")?.actions?.[0]).toMatchObject({
      kind: "PlaceInBattleAreaSelf",
    });
  });

  it("uses the TS field waiver, reveals in order, enters the battle area, and consumes Delay", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT24-009", as: "breedingTs" },
          hand: [{ card: "BT24-100", as: "option" }],
          deck: ["BT24-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT24-100"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT24-009")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);

    const permanent = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT24-100")!;
    permanent.enterFieldTurnCount = s.state.turnCount - 1;
    const source = (
      s.engine as unknown as { cardSourceOf(instance: NonNullable<typeof permanent.topCard>): CardSource }
    ).cardSourceOf(permanent.topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.description.includes("Gain 2"),
    )!.effectKey;
    const before = s.state.memory;
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: permanent.topCard!.instanceId, effectKey }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === before + 2);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT24-100")).toBe(true);
  });

  it("places itself in the battle area from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT24-100", as: "securityOption", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT24-100")).toBe(true);
  });
});
