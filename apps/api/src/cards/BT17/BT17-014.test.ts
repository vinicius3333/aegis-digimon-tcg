import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { EffectTiming, type CardInstance } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-014.js";
import "../BT12/BT12-088.js";
import "./BT17-011.js";
import "./BT17-012.js";

function handMainEffectKey(s: EngineSetup, instance: CardInstance): string {
  const source = (s.engine as unknown as { cardSourceOf(card: CardInstance): CardSource }).cardSourceOf(instance);
  const effect = effectsOf(EffectTiming.OnDeclaration, source).find(({ effectKey }) =>
    effectKey.startsWith("BT17-014/"),
  );
  if (effect?.effectKey === undefined) throw new Error("BT17-014 surfaces no [Hand][Main] effect");
  return effect.effectKey;
}

describe("BT17-014", () => {
  it("matches the catalog printed text, colors, level and evolution costs", () => {
    expect(getCardDefinition("BT17-014")).toMatchObject({
      cardId: "BT17-014",
      nameEn: "Aldamon",
      colors: ["Red", "Purple"],
      kinds: ["Digimon"],
      level: 5,
      dp: 8000,
      forms: ["Hybrid"],
      evoCosts: [
        { color: "Red", level: 4, memoryCost: 4 },
        { color: "Purple", level: 4, memoryCost: 4 },
      ],
    });
    expect(getCardDefinition("BT17-014")!.effectText).toBe(
      "[Hand] [Main] By placing 1 [Agunimon] and [BurningGreymon] from your trash under 1 of your [Takuya Kanbara]s, " +
        "digivolve it into this card as if that card is a level 4 red Digimon for a digivolution cost of 3.  " +
        "[When Digivolving] Delete 1 of your opponent's Digimon with 6000 DP or less.",
    );
    const inherited = getCardDefinition("BT17-014")!.inheritedEffectText!;
    expect(inherited.replace(/\u00a0/g, " ")).toBe(
      "[Your Turn] While this Digimon has the [Hybrid]/[Ten Warriors] trait, it doesn't activate " +
        "[Security] effects on option cards it checks.",
    );
    expect([...inherited].map((ch, i) => (ch.charCodeAt(0) === 0xa0 ? i : -1)).filter((i) => i >= 0)).toEqual([62]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("digivolves a Takuya Kanbara into itself for 3 by placing Agunimon and BurningGreymon", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      isFromHand: true,
      actions: [
        {
          kind: "Digivolve",
          target: { fromSelectionRef: "takuyaHost", filter: { kind: ["Tamer"] } },
          costOverride: 3,
          virtualBase: { level: 4, colors: ["Red"] },
          cost: { kind: "place", bindHostAs: "takuyaHost" },
          additionalCosts: [{ kind: "place", host: { filter: { boundRef: "takuyaHost" }, count: 1 } }],
        },
      ],
    });
    expect(compiled.effects?.[0]?.actions?.[0]).not.toHaveProperty("ignoreRequirements");
  });

  it("uses its [Hand][Main] effect to stack both trash materials, digivolve Takuya, draw and delete", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-014", as: "aldamon" }],
          battleArea: [{ card: "BT12-088", as: "takuya" }],
          trash: [
            { card: "BT17-011", as: "agunimon" },
            { card: "BT17-012", as: "burning" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true, autoOrderCards: false },
    );
    s.state.memory = 3;
    await s.ready();
    const aldamon = s.inst("aldamon");
    const takuyaInstanceId = s.perm("takuya").topCard.instanceId;
    const drawnId = s.inst("drawn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: aldamon.instanceId,
        effectKey: handMainEffectKey(s, aldamon),
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("takuya").topCard.cardId === "BT17-014");

    expect(s.perm("takuya").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT17-011", "BT17-012", "BT12-088"]),
    );
    expect(s.perm("takuya").stack.at(-1)?.cardId).toBe("BT12-088");
    expect(s.perm("takuya").stack.map(({ instanceId }) => instanceId)).toContain(takuyaInstanceId);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(drawnId);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === aldamon.instanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("gains the digivolution-card Tamer's inherited effect after digivolving, per Q6563", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-014", as: "aldamon" }],
          battleArea: [{ card: "BT12-088", as: "takuya" }],
          trash: [
            { card: "BT17-011", as: "agunimon" },
            { card: "BT17-012", as: "burning" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true, autoOrderCards: false },
    );
    s.state.memory = 3;
    await s.ready();
    const aldamon = s.inst("aldamon");

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: aldamon.instanceId,
        effectKey: handMainEffectKey(s, aldamon),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT17-014");
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("takuya").currentDP).toBe(14000);
  });

  it("deletes an opposing Digimon at 6000 DP or less", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "Delete", target: { filter: { dp: { op: "lte", value: 6000 } } } }],
    });
  });

  it("leaves an opposing Digimon above 6000 DP alive when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-014", as: "aldamon" }],
          battleArea: [{ card: "BT12-088", as: "takuya" }],
          trash: [
            { card: "BT17-011", as: "agunimon" },
            { card: "BT17-012", as: "burning" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "tank", dp: 7000 }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true, autoOrderCards: false },
    );
    s.state.memory = 3;
    await s.ready();
    const aldamon = s.inst("aldamon");
    const tankId = s.perm("tank").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: aldamon.instanceId,
        effectKey: handMainEffectKey(s, aldamon),
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("takuya").topCard.cardId === "BT17-014");

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("tank").topCard.instanceId).toBe(tankId);
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

  it("suppresses only Option security effects, and only under a Hybrid or Ten Warriors host", async () => {
    const matching = setupEngine({
      0: { battleArea: [{ card: "BT17-011", as: "host", under: ["BT17-014"] }] },
    });
    await matching.engine.recomputeContinuousEffects();
    expect(observe(matching.engine).suppressesSecurityEffect(matching.perm("host"), "BT2-107")).toBe(true);
    expect(observe(matching.engine).suppressesSecurityEffect(matching.perm("host"), "BT12-088")).toBe(false);

    const other = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT17-014"] }] },
    });
    await other.engine.recomputeContinuousEffects();
    expect(observe(other.engine).suppressesSecurityEffect(other.perm("host"), "BT2-107")).toBe(false);
  });
});
