import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-077.js";
import "./BT20-070.js";
import "./BT20-074.js";
import "./BT20-075.js";
import "../BT21/BT21-077.js";
import "./index.js";

describe("BT20-077 HeavyMetaldramon", () => {
  it("trashes to four hand cards, then plays a trash Digimon under the scaled DP ceiling", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "Trash",
        trackCount: "trashedThisEffect",
        target: { count: 1, untilHandSize: 4 },
      });
      expect(actions[1]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["trash"],
        payCost: false,
        dpCeilingModifier: { mode: "lowerCeiling", amount: 2000, scalingSource: "trashedThisEffect" },
      });
    }
  });

  it("grants qualifying Dark Dragon or Evil Dragon Digimon Rush, Blocker, and +2000 DP", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [
        { kind: "ModifyDP", amount: 2000, target: { count: "all" } },
        { kind: "GainKeyword", keyword: { keyword: "Rush" } },
        { kind: "GainKeyword", keyword: { keyword: "Blocker" } },
      ],
    });
  });

  it("publishes Blast/ACE/Overflow metadata and both alternate trait arms", async () => {
    expect(getCardDefinition("BT20-077")).toMatchObject({
      level: 6,
      playCost: 7,
      dp: 12000,
      isAce: true,
      overflowMemory: 4,
    });
    expect(compiled.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Dark Dragon", "Evil Dragon"], cost: 3, isAlternate: true },
    ]);
    for (const base of ["BT20-075", "BT21-077"] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "BT20-077", as: "heavy" }],
          deck: ["BT20-047"],
        },
      });
      s.state.memory = 3;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("heavy").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT20-077");
      expect(s.state.memory).toBe(0);
    }
  });

  it("on play with no discard keeps the 8000-DP ceiling and free-plays the eligible Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-077", as: "heavy" }, "BT20-047", "BT20-047", "BT20-047", "BT20-047"],
          trash: [{ card: "BT20-074", as: "eight" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("eight").instanceId);
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("heavy").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-074"));
    expect(s.state.players[0]!.hand).toHaveLength(4);
  });

  it("publicly trims an over-four hand and lowers the trash-play ceiling per card trashed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT20-077", as: "heavy" },
            { card: "BT20-047", as: "fodder1" },
            { card: "BT20-063", as: "fodder2" },
            { card: "BT20-047", as: "fodder3" },
            { card: "BT20-063", as: "fodder4" },
            { card: "BT20-047", as: "fodder5" },
            { card: "BT20-063", as: "fodder6" },
          ],
          trash: [{ card: "BT20-061", as: "eligible" }],
          deck: ["BT20-047", "BT20-048"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("heavy").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-061"));
    expect(s.state.players[0]!.hand).toHaveLength(4);
    expect(
      s.state.players[0]!.trash.filter((card) =>
        ["fodder1", "fodder2", "fodder3", "fodder4", "fodder5", "fodder6"].some(
          (alias) => s.inst(alias).instanceId === card.instanceId,
        ),
      ),
    ).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-061")).toBeDefined();
  });

  it("on evolution trashes to four and lowers the play ceiling by 2000 per discarded card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-075", as: "base" }],
          hand: [{ card: "BT20-077", as: "heavy" }, "BT20-047", "BT20-047", "BT20-047", "BT20-047"],
          deck: ["BT20-047"],
          trash: [
            { card: "BT20-074", as: "eight" },
            { card: "BT20-070", as: "six" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("six").instanceId);
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("heavy").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-070"));
    expect(s.state.players[0]!.hand).toHaveLength(4);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("eight").instanceId);
  });

  it("continuously grants both trait arms +2000 DP, Rush, and Blocker while excluding nonmatches", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-077", as: "source" },
          { card: "BT20-075", as: "dark" },
          { card: "BT21-077", as: "evil" },
          { card: "BT20-047", as: "nonmatch" },
        ],
      },
    });
    await s.ready();
    expect(s.perm("dark").currentDP).toBe(10000);
    expect(s.perm("evil").currentDP).toBe(9000);
    for (const alias of ["source", "dark", "evil"]) {
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Rush")).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Blocker")).toBe(true);
    }
    expect(s.perm("nonmatch").currentDP).toBe(2000);
    expect(observe(s.engine).hasKeyword(s.perm("nonmatch"), "Rush")).toBe(false);
  });

  it("publicly grants Rush to a newly played Dark Dragon and lets it attack that turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-077", as: "source" }],
          hand: [{ card: "BT20-075", as: "darkDragon" }, "BT20-047", "BT20-063"],
          security: ["BT1-010"],
        },
        1: { security: ["BT1-010"], deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darkDragon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("darkDragon"), "Rush"));
    expect(s.perm("darkDragon").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("darkDragon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("darkDragon").isSuspended).toBe(true);
  });

  it("publicly uses the granted Blocker to redirect an opponent attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-077", as: "source" },
            { card: "BT20-075", as: "darkDragon" },
          ],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT20-071", dp: 7000, as: "attacker" }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("darkDragon"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("darkDragon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("publicly Blast Digivolves from a legal level-5 trait source, trashes to four, and completes the Blocker window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-075", as: "base" }],
          hand: [
            { card: "BT20-077", as: "heavy" },
            { card: "BT20-047", as: "fodder1" },
            { card: "BT20-063", as: "fodder2" },
            { card: "BT20-047", as: "fodder3" },
            { card: "BT20-063", as: "fodder4" },
            { card: "BT20-047", as: "fodder5" },
          ],
          trash: [{ card: "BT20-061", as: "entryCandidate" }],
          security: [{ card: "BT1-010", as: "ownSecurity" }],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT20-071", dp: 7000, as: "attacker" }],
          security: [{ card: "BT1-010", as: "opponentSecurity" }],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const baseId = s.inst("base").instanceId;
    const heavyId = s.inst("heavy").instanceId;
    const entryCandidateId = s.inst("entryCandidate").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.findLast((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const choice = opened.eligibleCounters.find((entry) => entry.instanceId === heavyId);
    expect(choice).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: choice!.instanceId,
        effectKey: choice!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    expect(s.state.memory).toBe(10);
    expect(s.perm("base").topCard.cardId).toBe("BT20-077");
    expect(s.state.players[0]!.hand).toHaveLength(4);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === heavyId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === entryCandidateId)).toBe(true);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);

    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("base").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("base").topCard.cardId).toBe("BT20-077");
    expect(s.events.some((event) => event.kind === "blocked")).toBe(true);
  });

  it("charges Overflow -4 when the ACE leaves battle", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-077", as: "heavy" }] } });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("heavy").permanentId], "byEffect");
    expect(s.state.memory).toBe(-4);
  });
});
