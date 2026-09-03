import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-033.js";

describe("BT18-033 Patamon", () => {
  it("reveals it from hand, pays the Three Great Angels return cost, and plays this exact card in empty breeding", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Main",
      isFromHand: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          breeding: true,
          requiresEmpty: "breedingArea",
          payCost: false,
          optional: true,
          abortOnDecline: true,
          cost: { to: "deckBottom" },
        },
      ],
    });
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-033", as: "patamon" }],
          trash: [{ card: "BT1-063", as: "seraphimon" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const source = s.inst("patamon");
    const effectKey = effectsOf(EffectTiming.OnDeclaration, (s.engine as any).cardSourceOf(source)).find((effect) =>
      effect.effectKey.startsWith("BT18-033/"),
    )!.effectKey;

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey })).toEqual(
      { ok: true },
    );
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === source.instanceId);

    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT18-033");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("seraphimon").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT1-063");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === source.instanceId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("does not activate while the breeding area is occupied", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT18-033", as: "patamon" }],
        breeding: "BT1-030",
        trash: ["BT1-063"],
      },
    });
    await s.ready();

    const source = s.inst("patamon");
    const effectKey = effectsOf(EffectTiming.OnDeclaration, (s.engine as any).cardSourceOf(source)).find((effect) =>
      effect.effectKey.startsWith("BT18-033/"),
    )!.effectKey;

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey })).toEqual(
      { ok: false, reason: "illegal-target" },
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === source.instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-063")).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not activate without an exact Three Great Angels Digimon return cost", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT18-033", as: "patamon" }],
        trash: [{ card: "BT1-053", as: "angelOnly" }],
      },
    });
    await s.ready();

    const source = s.inst("patamon");
    const effectKey = effectsOf(EffectTiming.OnDeclaration, (s.engine as any).cardSourceOf(source)).find((effect) =>
      effect.effectKey.startsWith("BT18-033/"),
    )!.effectKey;

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey })).toEqual(
      { ok: false, reason: "illegal-target" },
    );
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === source.instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("angelOnly").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });

  it("may decline without paying the return cost or moving Patamon from hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-033", as: "patamon" }],
          trash: [{ card: "BT1-063", as: "seraphimon" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    const source = s.inst("patamon");
    const effectKey = effectsOf(EffectTiming.OnDeclaration, (s.engine as any).cardSourceOf(source)).find((effect) =>
      effect.effectKey.startsWith("BT18-033/"),
    )!.effectKey;

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey })).toEqual(
      { ok: true },
    );
    await settle();

    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === source.instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("seraphimon").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });
});
