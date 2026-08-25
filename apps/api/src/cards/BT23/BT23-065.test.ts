import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-065.js";

function mainEffectKey(s: EngineSetup): string {
  const source = (s.engine as any).cardSourceOf(s.inst("phantomon"));
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT23-065/"))!
    .effectKey;
}

describe("BT23-065 Phantomon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-065")).toMatchObject({
      cardId: "BT23-065",
      nameEn: "Phantomon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Ghost", "LIBERATOR"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("places Bakemon beneath Ghostmon and evolves into Phantomon for 2 with BT21-065's reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-065", as: "ghostmon" },
            { card: "BT23-087", as: "violet" },
          ],
          hand: [{ card: "BT23-065", as: "phantomon" }],
          trash: [{ card: "BT23-064", as: "bakemon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const phantomonId = s.inst("phantomon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: phantomonId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ghostmon").topCard?.instanceId === phantomonId);
    expect([...s.perm("ghostmon").stack, s.perm("ghostmon").topCard!].map((card) => card.cardId)).toEqual([
      "BT23-064",
      "BT21-065",
      "BT23-065",
    ]);
    expect(s.state.memory).toBe(3);
  });

  it("does not offer the hand Main effect without Violet Inboots", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-065", as: "ghostmon" }],
        hand: [{ card: "BT23-065", as: "phantomon" }],
        trash: [{ card: "BT23-064", as: "bakemon" }],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("phantomon").instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toMatchObject({ ok: false });
  });

  it("plays a level-4 Ghost from trash when Phantomon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-065", as: "phantomon" }],
          trash: [
            { card: "BT23-064", as: "ghost" },
            { card: "BT23-066", as: "tooHigh" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const ghostId = s.inst("ghost").instanceId;
    const highId = s.inst("tooHigh").instanceId;
    await (
      s.engine as unknown as {
        fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnDestroyedAnyone, {
      subjectPermanentId: s.perm("phantomon").permanentId,
    });
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === ghostId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === highId)).toBe(true);
  });

  it("offers the hand Main effect only while Violet Inboots is present", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Main") as any;
    expect(effect.isFromHand).toBe(true);
    expect(effect.condition).toMatchObject({
      kind: "youHave",
      filter: { nameOrTrait: [{ tokens: ["Violet Inboots"], match: "name" }] },
    });
  });

  it("places Bakemon from trash under a Ghostmon and then digivolves that same host into this card for 3", () => {
    const actions = (compiled.effects.find((entry) => entry.trigger === "Main") as any).actions;
    expect(actions[0]).toMatchObject({
      kind: "PlaceUnder",
      target: { filter: { zone: "trash", nameOrTrait: [{ tokens: ["Bakemon"], match: "name" }] }, count: 1 },
      underFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Ghostmon"], match: "name" }] },
      position: "bottom",
      bindHostAs: "ghostmonHost",
    });
    expect(actions[1]).toMatchObject({
      kind: "Digivolve",
      target: { fromSelectionRef: "ghostmonHost" },
      into: { filter: { controllerDefault: "mine", kind: ["Digimon"] } },
      from: ["hand"],
      source: "triggerSource",
      costOverride: 3,
      payCost: true,
      ignoreRequirements: true,
    });
  });

  it("may play a level 4 or lower Ghost Digimon from trash on deletion", () => {
    for (const effect of compiled.effects.filter((entry) => entry.trigger === "OnDeletion")) {
      expect(effect.actions[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["trash"],
        payCost: false,
        optional: true,
        target: {
          filter: { levelComparison: { op: "lte", value: 4 }, nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
        },
      });
    }
  });

  it("plays the eligible Ghost through a realistic inherited On Deletion stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-069", under: ["BT23-065"], as: "host" }],
          trash: [{ card: "BT23-064", as: "ghost" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const ghostId = s.inst("ghost").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === ghostId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === ghostId)).toBe(true);
  });
});
