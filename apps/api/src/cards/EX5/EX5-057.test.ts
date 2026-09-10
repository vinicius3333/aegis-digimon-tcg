import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import "../BT1/BT1-044.js";
import { compiled } from "./EX5-057.js";

describe("EX5-057 Labramon", () => {
  it("matches the catalog and encodes both printed clauses in complete IR", () => {
    expect(getCardDefinition("EX5-057")).toMatchObject({
      cardId: "EX5-057",
      nameEn: "Labramon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Beast"],
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      effectText:
        "[On Play] By trashing 1 card in your hand, you may return 1 Digimon card with the [Dark Animal]/[Shaman]\u00a0trait from your trash to the hand.",
      inheritedEffectText: "[Your Turn] [Once Per Turn] When an effect plays one of your Digimon, gain 1 memory.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      optional: true,
      abortOnDecline: true,
      target: {
        count: 1,
        filter: {
          zone: "trash",
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ match: "trait", tokens: ["Dark Animal", "Shaman"] }],
        },
      },
      cost: { kind: "trash", target: { count: 1, filter: { zone: "hand", controller: "mine" } } },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"], byEffect: true },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });

  it("trashes the paid hand card and returns exactly one matching trait Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-057", as: "source" },
            { card: "BT1-009", as: "cost" },
          ],
          trash: [
            { card: "BT1-039", as: "target" },
            { card: "BT1-009", as: "nearMatch" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("target").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("nearMatch").instanceId)).toBe(true);
  });

  it("can decline the optional cost and return, leaving both hand cards and trash unchanged", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-057", as: "source" },
            { card: "BT1-009", as: "cost" },
          ],
          trash: [{ card: "BT1-039", as: "target" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "EX5-057")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3650 through public effect-play routes: gains once, ignores manual play, and resets next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: ["EX5-057"] },
            { card: "BT1-044", as: "firstAttacker", under: [{ card: "BT1-032", as: "firstPlay" }] },
            { card: "BT1-044", as: "secondAttacker", under: [{ card: "BT1-032", as: "secondPlay" }] },
            { card: "BT1-044", as: "nextTurnAttacker", under: [{ card: "BT1-032", as: "nextTurnPlay" }] },
          ],
          deck: Array.from({ length: 40 }, () => "BT1-009"),
        },
        1: {
          security: Array.from({ length: 6 }, () => "BT1-009"),
          deck: Array.from({ length: 40 }, () => "BT1-009"),
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 8;
    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);
    const attack = (alias: string) =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm(alias).permanentId,
        target: { kind: "player" },
      });

    expect(attack("firstAttacker")).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("firstPlay").instanceId),
    );
    expect(s.state.memory).toBe(9);

    expect(attack("secondAttacker")).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("secondPlay").instanceId),
    );
    expect(s.state.memory).toBe(9);

    drive.endMainPhaseIfOpen(0);
    await drive.waitForMainPhase(1);
    drive.endMainPhaseIfOpen(1);
    await drive.waitForMainPhase(0);
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.memory).toBe(3);

    expect(attack("nextTurnAttacker")).toEqual({ ok: true });
    await settleAcrossTimers(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("nextTurnPlay").instanceId),
    );
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();

    drive.endMainPhaseIfOpen(0);
    await drive.waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps the inherited watcher through a legal purple level-2 evolution and rejects a yellow source", async () => {
    const resolve = async (base: string) => {
      const s = setupEngine({
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "EX5-057", as: "evolution" }],
          deck: ["BT1-010"],
        },
      });
      s.state.memory = 2;
      await s.ready();
      const result = s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      });
      await settle();
      return { result, state: s.state, engine: s };
    };

    const legal = await resolve("BT6-006");
    expect(legal.result).toEqual({ ok: true });
    expect(legal.engine.perm("base").topCard.cardId).toBe("EX5-057");
    expect(legal.engine.perm("base").stack.map((card) => card.cardId)).toEqual(["BT6-006"]);
    expect(legal.state.memory).toBe(2);
    expect(legal.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);

    const illegal = await resolve("BT1-006");
    expect(illegal.result).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(illegal.engine.perm("base").topCard.cardId).toBe("BT1-006");
    expect(
      illegal.state.players[0]!.hand.some((card) => card.instanceId === illegal.engine.inst("evolution").instanceId),
    ).toBe(true);
  });

  it("does not gain memory from a manual Digimon play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-057"] }],
        hand: [{ card: "BT1-012", as: "manual" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("manual").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.memory).toBe(7);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
