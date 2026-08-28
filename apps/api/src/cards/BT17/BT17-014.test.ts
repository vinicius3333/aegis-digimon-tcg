import { describe, expect, it } from "vitest";
import { EffectTiming, CardKind, type CardDefinition, type CardInstance } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { ContinuousEffectLedger } from "../../engine/effects/continuous.js";
import { compiled } from "./BT17-014.js";

function handMainEffectKey(s: EngineSetup, instance: CardInstance): string {
  const source = (s.engine as unknown as { cardSourceOf(card: CardInstance): CardSource }).cardSourceOf(instance);
  const effect = effectsOf(EffectTiming.OnDeclaration, source).find(({ effectKey }) =>
    effectKey.startsWith("BT17-014/"),
  );
  if (effect === undefined) throw new Error("BT17-014 surfaces no [Hand][Main] effect");
  return effect.effectKey;
}

describe("BT17-014", () => {
  it("digivolves a Takuya Kanbara into itself for 3 by placing Agunimon and BurningGreymon", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      isFromHand: true,
      actions: [
        {
          kind: "Digivolve",
          costOverride: 3,
          virtualBase: { level: 4, colors: ["Red"] },
          additionalCosts: [{ kind: "place" }],
        },
      ],
    });
    expect(compiled.effects?.[0]?.actions?.[0]).not.toHaveProperty("ignoreRequirements");
  });

  it("uses its [Hand][Main] effect to stack both trash materials and digivolve Takuya", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-014", as: "aldamon" }],
          battleArea: [{ card: "BT12-088", as: "takuya" }],
          trash: [
            { card: "BT17-011", as: "agunimon" },
            { card: "BT17-012", as: "burning" },
          ],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true, autoOrderCards: false },
    );
    s.state.memory = 3;
    await s.ready();
    const aldamon = s.inst("aldamon");
    const takuyaInstanceId = s.perm("takuya").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: aldamon.instanceId,
        effectKey: handMainEffectKey(s, aldamon),
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("takuya").topCard.cardId === "BT17-014");

    expect(s.perm("takuya").stack.map(({ cardId }) => cardId)).toEqual([
      "BT17-011",
      "BT17-012",
      "BT12-088",
    ]);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === aldamon.instanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    expect(s.perm("takuya").stack.map(({ instanceId }) => instanceId)).toContain(takuyaInstanceId);
  });

  it("deletes an opposing Digimon at 6000 DP or less", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "Delete", target: { filter: { dp: { op: "lte", value: 6000 } } } }],
    });
  });

  it("prevents security option effects as inherited for Hybrid or Ten Warriors", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "GrantStatic",
          grant: "noSecurityOptionEffects",
          duration: "permanent",
          condition: { kind: "selfHasTrait" },
        },
      ],
    });
  });

  it("disables security Option effects for a Hybrid host on its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-011", as: "host", under: ["BT17-014"] }] } });
    const option = {
      cardId: "TEST-OPTION",
      nameEn: "Test Option",
      kinds: [CardKind.Option],
      colors: [],
      types: [],
      playCost: 1,
      level: undefined,
      dp: undefined,
      digivolveRequirement: [],
    } as unknown as CardDefinition;
    await s.ready();
    const ledger = (s.engine as unknown as { continuous: ContinuousEffectLedger }).continuous;
    expect(ledger.isSecurityEffectDisabled(s.perm("host").permanentId, option)).toBe(true);
  });
});
