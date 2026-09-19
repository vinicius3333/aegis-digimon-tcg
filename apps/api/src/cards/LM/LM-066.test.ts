import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { compiled } from "./LM-066.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("LM-066 Zephagamon / Divine Tempest Ligero", () => {
  it("matches the catalog record", () => {
    expect(getCardDefinition("LM-066")).toMatchObject({
      nameEn: "Zephagamon",
      colors: ["Green"],
      kinds: ["Digimon", "Option"],
      level: 6,
      playCost: 6,
      dp: 13000,
      types: ["Magic Knight", "Vortex Warriors", "LIBERATOR"],
      isDualCard: true,
      dualEffect: "Divine Tempest Ligero",
      optionColorRequirements: ["Green"],
    });
  });

  it("compiles to full coverage with the printed keywords and digivolve header", () => {
    const runtime = runtimeCompiledCard("LM-066");
    expect(runtime?.coverage).toBe("full");
    expect(runtime?.residual).toEqual([]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toHaveLength(0);
    expect(compiled.keywords).toEqual([
      expect.objectContaining({ keyword: "Piercing" }),
      expect.objectContaining({ keyword: "Vortex" }),
      expect.objectContaining({ keyword: "Blocker" }),
    ]);
    expect(compiled.digivolutionRequirement).toEqual([
      { traits: ["Vortex Warriors"], basePlayCostMin: 11, cost: 2, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor("LM-066")).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects.filter((effect) => effect.sharedUseKey === "LM-066/unsuspend-then-battle")).toMatchObject([
      { trigger: "WhenDigivolving", frequency: "OncePerTurn" },
      { trigger: "WhenAttacking", frequency: "OncePerTurn" },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "BeforePayCost")).toMatchObject({
      condition: { kind: "wouldBeUsedAsOption" },
    });
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "otherThanYourEffect",
          cost: { kind: "suspend", target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } } },
        },
      ],
    });
  });

  it("digivolves for 2 from a play-cost-11 Vortex Warriors base and battles after unsuspending", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST18-12", as: "base" },
            { card: "BT1-009", as: "ally", suspended: true },
          ],
          hand: [{ card: "LM-066", as: "dual" }],
          deck: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "prey", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dual").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "LM-066");
    await settle();

    expect(s.state.memory).toBe(0);
    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("rejects the cost-2 path from a base whose play cost is below 11", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST18-10", as: "base" }],
        hand: [{ card: "LM-066", as: "dual" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dual").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).not.toEqual({ ok: true });
  });

  it("survives an opposing deletion once per turn by suspending a Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-066", as: "source", dp: 13000, suspended: true },
            { card: "BT1-009", as: "fodder" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 14000 }], security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("fodder").permanentId);
    s.state.memory = 3;
    await s.ready();
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("source").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "LM-066")).toBe(true);
    expect(s.perm("fodder").isSuspended).toBe(true);
  });

  it("locks an opposing permanent's unsuspend and bottom-decks 1 Digimon per 2 suspended Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "mineSuspended", suspended: true }],
          hand: [{ card: "LM-066", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "lockTarget", suspended: true },
            { card: "BT1-011", as: "bounced", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "LM-066"));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBeDefined();
  });

  it("returns nothing when fewer than 2 Digimon are suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "green" }],
          hand: [{ card: "LM-066", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "lockTarget", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "LM-066"));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
  it("shares the once-per-turn use between digivolving and attacking", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST18-12", as: "base" },
            { card: "BT1-009", as: "firstAlly", suspended: true },
            { card: "BT1-064", as: "secondAlly", suspended: true },
          ],
          hand: [{ card: "LM-066", as: "dual" }],
          deck: ["BT1-010"],
        },
        1: { security: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstAlly").topCard.instanceId, s.perm("secondAlly").topCard.instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dual").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "LM-066");
    await settle();
    expect(s.perm("firstAlly").isSuspended).toBe(false);
    expect(s.perm("secondAlly").isSuspended).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("secondAlly").isSuspended).toBe(true);
  });

  it("prevents only one deletion per turn even with another Digimon left to suspend", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-066", as: "source", dp: 13000, suspended: true },
            { card: "BT1-009", as: "firstFodder" },
            { card: "BT1-064", as: "secondFodder" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "firstAttacker", dp: 14000 },
            { card: "BT1-011", as: "secondAttacker", dp: 14000 },
          ],
          security: [],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("source").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "LM-066")).toBe(true);

    const survivor = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "LM-066")!;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "permanent", permanentId: survivor.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "LM-066"));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "LM-066")).toBe(false);
  });

  it("cannot pay the survival cost with the opponent's Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-066", as: "source", dp: 13000, suspended: true }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "attacker", dp: 14000 },
            { card: "BT1-011", as: "spare" },
          ],
          security: [],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("source").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "LM-066"));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.perm("spare").isSuspended).toBe(false);
  });

  it("keeps a locked opposing Tamer suspended through the opponent's unsuspend step", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "green" }],
          hand: [{ card: "LM-066", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-088", as: "tamer", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "LM-066"));

    expect(observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend")).toBe(true);
    await advance(s.engine).verb.unsuspend([s.perm("tamer").permanentId]);
    expect(s.perm("tamer").isSuspended).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend")).toBe(false);
  });

  it("reduces the Option use cost by 2 by suspending 2 Digimon and counts those Digimon for the bottom-deck clause", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-064", as: "firstPayer" },
            { card: "BT1-064", as: "secondPayer" },
          ],
          hand: [{ card: "LM-066", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-088", as: "lockTarget", suspended: true },
            { card: "BT1-010", as: "bounced" },
          ],
          deck: ["BT1-009", "BT1-011", "BT1-064", "BT1-088"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "LM-066"));

    expect(s.state.memory).toBe(4);
    expect(s.perm("firstPayer").isSuspended).toBe(true);
    expect(s.perm("secondPayer").isSuspended).toBe(true);
    expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toEqual([
      "BT1-009",
      "BT1-011",
      "BT1-064",
      "BT1-088",
      "BT1-010",
    ]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-088"]);
  });

  it("cannot be played as a Digimon, so the reducer has no non-Option play path", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-064", as: "firstPayer" },
            { card: "BT1-064", as: "secondPayer" },
          ],
          hand: [{ card: "LM-066", as: "digimon" }],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("digimon").instanceId,
        useAs: "digimon",
      } as never),
    ).not.toEqual({ ok: true });
    expect(s.state.memory).toBe(8);
    expect(s.perm("firstPayer").isSuspended).toBe(false);
    expect(s.perm("secondPayer").isSuspended).toBe(false);
  });

  it("does not reduce the digivolve cost even with 2 Digimon available to suspend", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST18-12", as: "base" },
            { card: "BT1-064", as: "firstPayer" },
            { card: "BT1-064", as: "secondPayer" },
          ],
          hand: [{ card: "LM-066", as: "dual" }],
          deck: ["BT1-010"],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dual").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "LM-066");
    await settle();

    expect(s.state.memory).toBe(2);
    expect(s.perm("firstPayer").isSuspended).toBe(false);
    expect(s.perm("secondPayer").isSuspended).toBe(false);
  });

  it("counts suspended Digimon on both sides, including when only yours are suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-064", as: "mineFirst", suspended: true },
            { card: "BT1-009", as: "mineSecond", suspended: true },
          ],
          hand: [{ card: "LM-066", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "bounced" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "LM-066"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-010");
  });
});
