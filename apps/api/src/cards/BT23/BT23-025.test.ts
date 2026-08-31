import { EffectTiming, getCardDefinition, type CardInstance } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-025.js";

function handMainEffectKey(s: EngineSetup, instance: CardInstance): string {
  const source = (s.engine as unknown as { cardSourceOf(i: CardInstance): CardSource }).cardSourceOf(instance);
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT23-025/"))!
    .effectKey;
}

describe("BT23-025 MarineAngemon", () => {
  it("returns the lowest-level opposing Digimon on play and when digivolving", () => {
    expect(getCardDefinition("BT23-025")).toMatchObject({
      cardId: "BT23-025",
      nameEn: "MarineAngemon",
      colors: ["Blue", "Yellow"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [
        { color: "Blue", level: 5, memoryCost: 3 },
        { color: "Yellow", level: 5, memoryCost: 3 },
      ],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Fairy", "CS"],
    });
    expect(compiled.effects.filter(({ trigger }) => ["OnPlay", "WhenDigivolving"].includes(trigger))).toHaveLength(2);
    expect(compiled.effects.find(({ trigger }) => trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Return",
      target: { filter: { superlative: "lowestLevel" } },
    });
  });

  it("defers the Security play until the security battle ends and schedules turn-end deletion", async () => {
    const security = compiled.effects.find(({ trigger }) => trigger === "Security")!;
    expect(security.actions).toEqual([
      expect.objectContaining({ kind: "PlayWithoutCost", payCost: false }),
      expect.objectContaining({ kind: "DelayedDeletePlayed" }),
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("gates the entire hand Main behind a CS permanent and one payment of 5, per Q5253-Q5254", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-017", as: "cs" }],
          hand: [{ card: "BT23-025", as: "marine" }],
          security: [{ card: "BT1-009", as: "oldTop" }],
        },
        1: { battleArea: [{ card: "BT23-016", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const marine = s.inst("marine");
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: marine.instanceId,
        effectKey: handMainEffectKey(s, marine),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === marine.instanceId));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toContain(marine.instanceId);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);

    const blocked = setupEngine({ 0: { hand: [{ card: "BT23-025", as: "marine" }] } });
    blocked.state.memory = 5;
    await blocked.ready();
    const blockedMarine = blocked.inst("marine");
    expect(
      blocked.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: blockedMarine.instanceId,
        effectKey: handMainEffectKey(blocked, blockedMarine),
      }),
    ).toMatchObject({ ok: false });
    expect(blocked.state.players[0]!.hand.map((card) => card.instanceId)).toContain(blockedMarine.instanceId);
    expect(blocked.state.memory).toBe(5);
  });

  it("does not place itself in security when the 5-memory cost is unpayable", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-017", as: "cs" }], hand: [{ card: "BT23-025", as: "marine" }] },
    });
    s.state.memory = -6;
    await s.ready();
    const marine = s.inst("marine");
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: marine.instanceId,
        effectKey: handMainEffectKey(s, marine),
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(marine.instanceId);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("may decline the hand Main processing condition before paying 5", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-017", as: "cs" }],
          hand: [{ card: "BT23-025", as: "marine" }],
          security: [{ card: "BT1-009", as: "oldTop" }],
        },
        1: { battleArea: [{ card: "BT23-016", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const marine = s.inst("marine");

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: marine.instanceId,
        effectKey: handMainEffectKey(s, marine),
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(marine.instanceId);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
  });

  it("returns exactly one opposing Digimon tied for the lowest level on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-025", as: "marine" }] },
        1: {
          battleArea: [
            { card: "BT23-016", as: "lowest" },
            { card: "BT23-018", as: "higher" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("lowest").instanceId));
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("higher").instanceId),
    ).toBe(true);
  });

  it("plays itself from Security and deletes only that played Digimon at turn end, per Q5563-Q5564", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT23-025", as: "marine" }] } });
    const marineId = s.inst("marine").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("marine"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === marineId));
    await advance(s.engine).fireSubTrigger("endOfTurn", { turnSeat: 0 });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === marineId));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(marineId);
  });
});
