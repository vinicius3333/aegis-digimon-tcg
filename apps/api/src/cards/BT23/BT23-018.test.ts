import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-018.js";

function mainEffectKey(s: EngineSetup): string {
  const source = (s.engine as any).cardSourceOf(s.inst("garurumon"));
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT23-018/"))!
    .effectKey;
}

describe("BT23-018 Garurumon", () => {
  it("matches every catalog field and carries every printed clause in IR", () => {
    expect(getCardDefinition("BT23-018")).toMatchObject({
      cardId: "BT23-018",
      nameEn: "Garurumon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 5000,
      evoCosts: [
        { color: "Blue", level: 3, memoryCost: 2 },
        { color: "Red", level: 3, memoryCost: 2 },
      ],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Beast", "CS"],
      inheritedEffectText: "[Opponent's Turn] This Digimon gets +2000 DP.",
    });
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Jamming", raw: "＜Jamming＞" }]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "OpponentsTurn",
          isInherited: true,
          actions: [expect.objectContaining({ kind: "ModifyDP", amount: 2000, duration: "permanent" })],
        }),
      ]),
    );
  });

  it("once per turn pays the restack cost before playing Agumon or Nokia for two less", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Main") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: { controller: "mine", nameOrTrait: [{ tokens: ["Agumon", "Nokia Shiramine"], match: "name" }] },
        count: 1,
      },
      from: ["hand"],
      payCost: true,
      reduceCostBy: 2,
      cost: {
        kind: "place",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        raw: "By placing this Digimon's top stacked card as its bottom digivolution card",
      },
      optional: true,
      abortOnDecline: true,
    });
  });

  it("pays the restack cost, then plays Agumon for exactly 2 less, per Q5236", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-018", as: "garurumon", under: ["BT23-001", "BT23-017"] }],
          hand: [{ card: "BT1-010", as: "agumon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const garurumonId = s.inst("garurumon").instanceId;
    const exposedId = s.perm("garurumon").stack.at(-1)!.instanceId;

    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: garurumonId, effectKey: mainEffectKey(s) }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("agumon").instanceId),
    );

    expect(s.state.memory).toBe(4);
    expect(s.perm("garurumon").topCard.instanceId).toBe(exposedId);
    expect(s.perm("garurumon").stack[0]!.instanceId).toBe(garurumonId);
  });

  it("cannot declare without a digivolution card, per Q5237", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-018", as: "garurumon" }], hand: ["BT1-010"] } });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("garurumon").instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toMatchObject({ ok: false });
  });

  it("allows refusal before paying the restack cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-018", as: "garurumon", under: ["BT23-001"] }],
          hand: [{ card: "BT22-084", as: "nokia" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const before = [
      s.perm("garurumon").topCard.instanceId,
      ...s.perm("garurumon").stack.map((card) => card.instanceId),
    ];
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("garurumon").instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle();
    expect([
      s.perm("garurumon").topCard.instanceId,
      ...s.perm("garurumon").stack.map((card) => card.instanceId),
    ]).toEqual(before);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nokia").instanceId);
  });

  it("grants inherited +2000 DP only during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-007", as: "host", under: ["BT23-018"] }] } });
    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(1000);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(3000);
  });
});
