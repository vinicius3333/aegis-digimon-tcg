import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-094.js";
import "../index.js";

describe("BT24-094 Central Town: Throne Room", () => {
  it("encodes color waiver, face-up security static effects, main security exchange, and Security play", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          condition: { kind: "youHaveNone", filter: { zone: "security", faceUp: true } },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      isSecurity: true,
      actions: [
        { kind: "ModifyDP", amount: 2000, duration: "permanent" },
        { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Alliance" } } },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Main",
      actions: [
        { kind: "SecurityManipulation", op: "toHand", toTop: false },
        { kind: "SecurityManipulation", op: "placeAsSecurity", toTop: false, faceUp: true },
        { kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 3 },
      ],
    });
    expect(compiled.effects[3]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true }],
    });
  });

  it("exchanges bottom security for itself and plays a reduced-cost TS Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-094", as: "source" }],
          hand: [{ card: "BT24-101", as: "digimon" }],
          security: [{ card: "BT1-001", as: "bottom" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const sourceCard = s.perm("source").topCard!;
    const source = (s.engine as unknown as { cardSourceOf(card: typeof sourceCard): CardSource }).cardSourceOf(
      sourceCard,
    );
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT24-094/"),
    )?.effectKey;
    expect(effectKey).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: sourceCard.instanceId,
        effectKey: effectKey!,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT24-101"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === sourceCard.instanceId && card.faceUp)).toBe(
      true,
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT24-101")).toBe(true);
  });
});
