import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_033 } from "./BT24-033.js";
import "../index.js";

describe("BT24-033 Salamon", () => {
  it("matches the immutable catalog identity and evolution routes", () => {
    expect(getCardDefinition("BT24-033")).toMatchObject({
      cardId: "BT24-033",
      nameEn: "Salamon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Mammal", "Iliad", "TS"],
      evoCosts: [
        { color: "Yellow", level: 2, memoryCost: 0 },
        { color: "Red", level: 2, memoryCost: 0 },
      ],
    });
    expect(BT24_033.digivolutionRequirement).toEqual([{ level: 2, traits: ["TS"], cost: 0, isAlternate: true }]);
  });

  it("reduces your-turn Iliad digivolution costs by one", () => {
    const effect = BT24_033.effects?.find((entry) => entry.trigger === "YourTurn");
    expect(effect?.actions?.[0]).toMatchObject({
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true, zone: "battleArea" },
      into: { nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }] },
      actions: [{ mode: "reduceCost", amount: 1 }],
    });
    expect(BT24_033.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Barrier");
  });

  it("reduces an Iliad evolution in the battle area by 1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-033", as: "salamon" }],
        hand: [{ card: "BT24-034", as: "aegiomon" }],
        deck: [{ card: "BT1-009", as: "evolutionDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("salamon").permanentId,
        instanceId: s.inst("aegiomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("salamon").topCard.instanceId === s.inst("aegiomon").instanceId);

    expect(s.state.memory).toBe(4);
    expect(s.perm("salamon").topCard.instanceId).toBe(s.inst("aegiomon").instanceId);
    expect(s.perm("salamon").stack.map((card) => card.instanceId)).toEqual([s.inst("salamon").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
  });

  it("does not reduce a public evolution into a non-Iliad Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-033", as: "salamon" }],
        hand: [{ card: "BT1-051", as: "nonIliad" }],
        deck: [{ card: "BT1-009", as: "evolutionDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("salamon").permanentId,
        instanceId: s.inst("nonIliad").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("salamon").topCard.instanceId === s.inst("nonIliad").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("salamon").topCard.instanceId).toBe(s.inst("nonIliad").instanceId);
    expect(s.perm("salamon").stack.map((card) => card.instanceId)).toEqual([s.inst("salamon").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
  });

  it("does not reduce the same Iliad evolution in breeding (Q5612)", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT24-033", as: "salamon" },
        hand: [{ card: "BT24-034", as: "aegiomon" }],
        deck: [{ card: "BT1-009", as: "breedingDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("salamon").permanentId,
        instanceId: s.inst("aegiomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("salamon").topCard.instanceId === s.inst("aegiomon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("salamon").topCard.instanceId).toBe(s.inst("aegiomon").instanceId);
    expect(s.perm("salamon").stack.map((card) => card.instanceId)).toEqual([s.inst("salamon").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("breedingDraw").instanceId);
  });

  it("grants inherited Barrier and uses the level-2 TS alternate evolution for cost 0", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-034", as: "host", under: ["BT24-033"] }],
        breeding: { card: "BT24-003", as: "egg" },
        hand: [{ card: "BT24-033", as: "salamon" }],
        deck: [{ card: "BT1-009", as: "evolutionDraw" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("salamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("salamon").instanceId);
    expect(s.state.memory).toBe(3);
    expect(s.perm("egg").topCard.instanceId).toBe(s.inst("salamon").instanceId);
    expect(s.perm("egg").stack.map((card) => card.instanceId)).toEqual([s.inst("egg").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
  });

  it.each([
    ["yellow", "BT1-006", "yellowDraw"],
    ["red", "BT1-001", "redDraw"],
  ])("uses the normal %s Digi-Egg route for cost 0", async (_label, eggCard, drawAlias) => {
    const s = setupEngine({
      0: {
        breeding: { card: eggCard, as: "egg" },
        hand: [{ card: "BT24-033", as: "salamon" }],
        deck: [{ card: "BT1-009", as: drawAlias }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const eggId = s.perm("egg").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("salamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("salamon").instanceId);
    expect(s.state.memory).toBe(3);
    expect(s.perm("egg").topCard.instanceId).toBe(s.inst("salamon").instanceId);
    expect(s.perm("egg").stack.map((card) => card.instanceId)).toEqual([eggId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst(drawAlias).instanceId);
  });

  it("uses inherited Barrier in a public battle by trashing its security card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", suspended: true, under: ["BT24-033"] }],
          security: [{ card: "BT1-091", as: "barrierSecurity" }],
        },
        1: { battleArea: [{ card: "BT1-020", as: "attacker", dp: 6000 }] },
      },
      { autoSelectCards: false },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const sourceId = s.perm("host").stack[0]!.instanceId;
    const securityId = s.inst("barrierSecurity").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.events).toContainEqual({ kind: "barrierPrompt", permanentId: hostId });
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept: true })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "barrierResolved"));
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.events.some((event) => event.kind === "combatResolved")).toBe(true);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(hostId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(securityId);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("rejects a blue non-TS Digi-Egg for both normal and alternate routes", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-003", as: "blueEgg" },
        hand: [{ card: "BT24-033", as: "salamon" }],
        deck: [{ card: "BT1-009", as: "draw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const eggId = s.perm("blueEgg").topCard.instanceId;
    const salamonId = s.inst("salamon").instanceId;
    const drawId = s.inst("draw").instanceId;
    for (const useAlternateCost of [false, true]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("blueEgg").permanentId,
          instanceId: salamonId,
          ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
        }),
      ).toEqual({ ok: false, reason: "invalid-evolution" });
    }
    expect(s.state.memory).toBe(5);
    expect(s.perm("blueEgg").topCard.instanceId).toBe(eggId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([salamonId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([drawId]);
  });

  it("declines inherited Barrier publicly and trashes the exact host stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", suspended: true, under: ["BT24-033"] }],
          security: [{ card: "BT1-091", as: "barrierSecurity" }],
        },
        1: { battleArea: [{ card: "BT1-020", as: "attacker", dp: 6000 }] },
      },
      { autoSelectCards: false },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const hostCardId = s.perm("host").topCard.instanceId;
    const sourceId = s.perm("host").stack[0]!.instanceId;
    const securityId = s.inst("barrierSecurity").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept: false })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.events.some((event) => event.kind === "combatResolved")).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([hostCardId, sourceId]),
    );
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toContain(securityId);
  });
});
