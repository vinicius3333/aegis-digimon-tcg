import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-019.js";
import "./BT10-021.js";
import "./BT10-024.js";
import "./BT10-088.js";
import "./BT10-097.js";

describe("BT10-097 Blazing Memory Boost!", () => {
  it("adds 2 Blue Flare cards, plays Kiriha, bottoms the rest, and enters the battle area", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT10-017"],
          hand: [{ card: "BT10-097", as: "option" }],
          deck: [
            { card: "BT10-019", as: "blueFlare1" },
            { card: "BT10-021", as: "blueFlare2" },
            { card: "BT10-088", as: "kiriha" },
            { card: "BT1-009", as: "rest1" },
            { card: "BT1-010", as: "rest2" },
            { card: "BT1-011", as: "rest3" },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferred,
      },
    );
    const optionId = s.inst("option").instanceId;
    preferred.push(s.inst("blueFlare1").instanceId, s.inst("blueFlare2").instanceId, s.inst("kiriha").instanceId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId) &&
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("kiriha").instanceId,
        ) &&
        s.state.players[0]!.deck.length === 3,
    );

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("blueFlare1").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("blueFlare2").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("rest1").instanceId,
      s.inst("rest2").instanceId,
      s.inst("rest3").instanceId,
    ]);
  });

  it("cannot play Kiriha when it must be taken as one of fewer than 2 available Blue Flare cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT10-017"],
          hand: [{ card: "BT10-097", as: "option" }],
          deck: [
            { card: "BT10-019", as: "blueFlare" },
            { card: "BT10-088", as: "kiriha" },
            "BT1-009",
            "BT1-010",
            "BT1-011",
            "BT1-012",
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true, autoOrderTriggers: true },
    );
    const optionId = s.inst("option").instanceId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("kiriha").instanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("kiriha").instanceId),
    ).toBe(false);
  });

  it("may decline the reveal branch but still places itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT10-017"],
          hand: [{ card: "BT10-097", as: "option" }],
          deck: ["BT10-019", "BT10-021", "BT10-088", "BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    const optionId = s.inst("option").instanceId;
    const deckOrder = s.state.players[0]!.deck.map((card) => card.instanceId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(deckOrder);
  });

  it("Security places itself in the battle area", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT10-097", as: "option", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("option").instanceId),
    ).toBe(true);
  });

  it("exposes its Delay activation while established in the battle area", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-097", as: "option" }] } });

    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).activatableEffects(s.perm("option"))).toEqual(
      expect.arrayContaining([expect.objectContaining({ description: expect.stringMatching(/delay/i) })]),
    );
  });

  it("executes the Blue Flare deck line from Blazing Memory Boost through Rush and Material Save", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-018", as: "blueSource" }],
          hand: [
            { card: "BT10-097", as: "boost" },
            { card: "BT10-024", as: "metalGreymon" },
          ],
          deck: [
            { card: "BT10-019", as: "greymon" },
            { card: "BT10-021", as: "mailbirdramon" },
            { card: "BT10-088", as: "kiriha" },
            "BT1-009",
            "BT1-010",
            "BT1-011",
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "firstFrozen" },
            { card: "BT1-011", as: "secondFrozen" },
          ],
          security: ["BT5-086", "BT5-086"],
          deck: ["BT1-009"],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderCards: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.inst("greymon").instanceId, s.inst("mailbirdramon").instanceId, s.inst("kiriha").instanceId);
    s.state.memory = 10;
    const boostId = s.inst("boost").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("boost").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("greymon").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("mailbirdramon").instanceId) &&
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("kiriha").instanceId,
        ) &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === boostId),
    );
    const boost = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === boostId)!;
    const kiriha = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("kiriha").instanceId,
    )!;

    s.state.turnCount += 1;
    await s.engine.recomputeContinuousEffects();
    const activatableEffects = observe(s.engine).activatableEffects(boost) as Array<{
      description: string;
      effectKey: string;
    }>;
    const delay = activatableEffects.find((entry) => /delay/i.test(entry.description));
    expect(delay).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: boost.topCard.instanceId,
        effectKey: delay!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.memory === 9 && s.state.players[0]!.trash.some((card) => card.instanceId === boost.topCard.instanceId),
    );

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("metalGreymon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("greymon").instanceId, s.inst("mailbirdramon").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      ["firstFrozen", "secondFrozen"].every(
        (alias) =>
          observe(s.engine).isRestricted(s.perm(alias), "attack") &&
          observe(s.engine).isRestricted(s.perm(alias), "block"),
      ),
    );
    const metalGreymon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("metalGreymon").instanceId,
    )!;
    expect(observe(s.engine).hasKeyword(metalGreymon, "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(metalGreymon, "MaterialSave")).toBe(true);
    expect(metalGreymon.stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("greymon").instanceId, s.inst("mailbirdramon").instanceId]),
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: metalGreymon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === metalGreymon.permanentId) &&
        kiriha.stack.length === 2,
    );

    expect(kiriha.stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("greymon").instanceId, s.inst("mailbirdramon").instanceId]),
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("metalGreymon").instanceId)).toBe(true);
  });
});
