import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-024.js";
import "../index.js";

const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-009"];

describe("EX4-024 Renamon", () => {
  it("registers its official identity and alternate Viximon evolution", () => {
    expect(getCardDefinition("EX4-024")).toMatchObject({
      cardId: "EX4-024",
      nameEn: "Renamon",
      colors: ["Yellow", "Blue"],
      level: 3,
      playCost: 4,
      dp: 2000,
      evoCosts: [
        { color: "Yellow", level: 2, memoryCost: 1 },
        { color: "Blue", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Beastkin"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Viximon"], cost: 0, isAlternate: true }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Restrict",
      restriction: "attack",
      duration: "untilOpponentTurnEnd",
      target: { filter: { controller: "opponent", dp: { op: "lte", value: 4000 } }, count: 2 },
    });
  });

  it.each([
    ["yellow", "BT1-006"],
    ["blue", "BT1-003"],
  ])("digivolves from a %s level-2 Digi-Egg for 1", async (_color, baseCard) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "EX4-024", as: "renamon" }],
        deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
        security: SECURITY,
      },
      1: { security: SECURITY, deck: FILLER },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("renamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-024");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([baseCard]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
  });

  it("digivolves from exact Viximon for 0", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-003", as: "viximon" }],
        hand: [{ card: "EX4-024", as: "renamon" }],
        deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
        security: SECURITY,
      },
      1: { security: SECURITY, deck: FILLER },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("viximon").permanentId,
        instanceId: s.inst("renamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("viximon").topCard.cardId === "EX4-024");

    expect(s.state.memory).toBe(0);
    expect(s.perm("viximon").stack.map((card) => card.cardId)).toEqual(["EX2-003"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
  });
  it("gains memory once per turn when using an Option costing at least two", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });

  it("blocks attacks at 4000 DP while leaving the 5000-DP boundary free", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX4-024", as: "renamon" }], security: SECURITY, deck: FILLER },
        1: {
          battleArea: [
            { card: "BT1-009", as: "restrictedAtBoundary", dp: 4000 },
            { card: "BT1-010", as: "secondRestricted", dp: 3000 },
            { card: "BT1-013", as: "allowed", dp: 5000 },
          ],
          security: SECURITY,
          deck: FILLER,
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("renamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX4-024"));

    s.state.turnSeat = 1;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("restrictedAtBoundary").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondRestricted").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("allowed").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("gains memory from one real cost-2 Option, not a cost-1 Option or a second cost-2 use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-003", as: "viximon" }],
          hand: [
            { card: "EX4-024", as: "renamon" },
            { card: "EX4-026", as: "youkomon" },
            { card: "BT1-098", as: "qualifying1" },
            { card: "BT1-096", as: "cheap" },
            { card: "BT1-098", as: "qualifying2" },
          ],
          deck: [{ card: "BT1-009", as: "evolutionDraw" }, ...FILLER],
          security: SECURITY,
        },
        1: { security: SECURITY, deck: FILLER },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 13;
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("viximon").permanentId,
        instanceId: s.inst("renamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("viximon").topCard.cardId === "EX4-024");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("viximon").permanentId,
        instanceId: s.inst("youkomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("viximon").topCard.cardId === "EX4-026");
    expect(s.perm("viximon").stack.map((card) => card.cardId)).toEqual(["EX2-003", "EX4-024"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
    const qualifying1Id = s.inst("qualifying1").instanceId;
    const cheapId = s.inst("cheap").instanceId;
    const qualifying2Id = s.inst("qualifying2").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: qualifying1Id })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === qualifying1Id));
    expect(s.state.memory).toBe(9);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: cheapId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === cheapId));
    expect(s.state.memory).toBe(8);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: qualifying2Id })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === qualifying2Id));
    expect(s.state.memory).toBe(6);
  });

  it("does not trigger when the Option's own use cost is reduced below two (Q5488)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-003", as: "viximon" }],
          hand: [
            { card: "EX4-024", as: "renamon" },
            { card: "EX4-026", as: "youkomon" },
            { card: "BT7-100", as: "option" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT9-035", as: "target" }], security: SECURITY, deck: FILLER },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("viximon").permanentId,
        instanceId: s.inst("renamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("viximon").topCard.cardId === "EX4-024");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("viximon").permanentId,
        instanceId: s.inst("youkomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("viximon").topCard.cardId === "EX4-026");
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 3000);
    expect(s.state.memory).toBe(6);
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("triggers after a cost-reduced payment when the printed use cost is at least two (Q5489/Q3466)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-003", as: "viximon" },
            { card: "BT1-009", as: "redSource" },
          ],
          hand: [
            { card: "EX4-024", as: "renamon" },
            { card: "EX4-026", as: "youkomon" },
            { card: "BT21-093", as: "option" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
          security: SECURITY,
        },
        1: {
          battleArea: [
            { card: "BT9-035", as: "highest" },
            { card: "BT1-014", as: "survivor" },
          ],
          security: ["BT1-009", "BT1-013", "BT1-009"],
          deck: FILLER,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("viximon").permanentId,
        instanceId: s.inst("renamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("viximon").topCard.cardId === "EX4-024");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("viximon").permanentId,
        instanceId: s.inst("youkomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("viximon").topCard.cardId === "EX4-026");
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard.cardId)).toEqual(["BT1-014"]);
  });

  it("triggers for a free Option use through a public digivolution (Q5490)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-003", as: "viximon" }],
          hand: [
            { card: "EX4-024", as: "renamon" },
            { card: "EX4-026", as: "youkomon" },
            { card: "EX4-028", as: "doumon" },
            { card: "EX4-030", as: "kuzuhamon" },
            { card: "BT1-102", as: "option" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
          security: SECURITY,
        },
        1: { security: SECURITY, deck: FILLER },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderCards: true,
        preferTriggerKeys: ["EX4-024"],
      },
    );
    s.state.memory = 10;
    await s.ready();
    let spent = 0;
    const evolve = async (instanceId: string, cost: number, expectedWatcherGain = 0) => {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("viximon").permanentId,
          instanceId,
          ...(cost === 0 ? { alternateRequirementIndex: 0 } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("viximon").topCard.instanceId === instanceId);
      spent += cost;
      expect(s.state.memory).toBe(10 - spent + expectedWatcherGain);
    };
    await evolve(s.inst("renamon").instanceId, 0);
    await evolve(s.inst("youkomon").instanceId, 3);
    await evolve(s.inst("doumon").instanceId, 4);
    await evolve(s.inst("kuzuhamon").instanceId, 3, 1);
    await settle(
      () =>
        s.state.memory === 1 &&
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId),
    );
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
  });

  it("does not trigger for an Option resolving as a security effect (Q5487)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-003", as: "base" }],
          hand: [
            { card: "EX4-024", as: "renamon" },
            { card: "BT1-051", as: "youkomon" },
          ],
          deck: FILLER,
          security: [{ card: "BT1-102", as: "securityOption" }, ...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT9-035", as: "attacker" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: FILLER,
          security: SECURITY,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const securityOptionId = s.inst("securityOption").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("renamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-024");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("youkomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-051");
    s.state.turnSeat = 1;
    s.state.memory = 8;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(securityOptionId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).not.toContain(securityOptionId);
  });

  it("resets the inherited once-per-turn watcher on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-026", as: "host", under: ["EX2-003", "EX4-024"] }],
          hand: [
            { card: "BT1-098", as: "first" },
            { card: "BT1-098", as: "second" },
            { card: "BT1-098", as: "third" },
          ],
          deck: FILLER,
          security: SECURITY,
        },
        1: { security: SECURITY, deck: FILLER, hand: [{ card: "BT1-009", as: "opponentSpare" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    s.state.turnSeat = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    const firstId = s.inst("first").instanceId;
    const secondId = s.inst("second").instanceId;
    const thirdId = s.inst("third").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === firstId));
    expect(s.state.memory).toBe(9);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === secondId));
    expect(s.state.memory).toBe(7);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("third").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === thirdId));
    expect(s.state.memory).toBe(2);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
