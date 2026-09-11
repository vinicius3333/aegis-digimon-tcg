import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-101.js";

describe("BT23-101 Hudiemon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-101")).toMatchObject({
      cardId: "BT23-101",
      nameEn: "Hudiemon",
      colors: ["Green", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 7,
      dp: 7000,
      types: ["Insectoid", "Hudie", "CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("scales the mandatory DP tail by every friendly Hudie Digimon through a public play", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          hand: [{ card: "BT23-101", as: "hudiemon" }],
          battleArea: [
            { card: "BT23-040", as: "hudieA" },
            { card: "BT23-040", as: "hudieB" },
          ],
        },
        1: { deck: ["BT1-009", "BT1-010"], battleArea: [{ card: "BT10-055", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hudiemon").instanceId })).toEqual({
      ok: true,
    });
    // Three friendly Hudie Digimon (two Wormmon plus the entering Hudiemon): 13000 - 3 x 3000.
    await settle(() => s.perm("target").currentDP === 4000 && s.state.pendingDecision === undefined);
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // Q5573: nothing is deleted part-way through the effect; the 0-DP check happens once the whole
  // [On Play] has resolved. Closest public fixture: the tail itself drives the target to exactly 0.
  // The printed Q&A board ("all of your Digimon get -5000 DP") has no arrangeable printed source.
  it("deletes a target the DP tail drives to exactly 0, only after the whole effect resolves (Q5573)", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          hand: [
            { card: "BT23-101", as: "hudiemon" },
            { card: "BT23-010", as: "freeCs" },
          ],
          battleArea: [
            { card: "BT23-040", as: "hudieA" },
            { card: "BT23-040", as: "hudieB" },
          ],
        },
        // BT1-059 is an inert level-5 9000-DP body: 9000 - 3 x 3000 = 0.
        1: { deck: ["BT1-009", "BT1-010"], battleArea: [{ card: "BT1-059", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hudiemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("target").instanceId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("target").instanceId);
    // The card the same effect played survives the same deletion checkup.
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("freeCs").instanceId),
    ).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  // Q5572: the played card's own [On Play] waits until every part of Hudiemon's effect, including
  // the part after "then", has resolved. BT23-011 Birdramon deletes an opponent Digimon with 4000
  // DP or less, so it can only reach a 7000-DP body if the -3000 tail already applied.
  it.each([
    ["7000 body deleted because the tail resolved first", "BT11-051", true],
    ["8000 body survives: 5000 is still above Birdramon's 4000 gate", "BT10-010", false],
  ] as const)("Q5572 derived [On Play] resolves after the DP tail — %s", async (_label, targetCard, deleted) => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          hand: [
            { card: "BT23-101", as: "hudiemon" },
            { card: "BT23-011", as: "birdramon" },
          ],
        },
        1: { deck: ["BT1-009", "BT1-010"], battleArea: [{ card: targetCard, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hudiemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("birdramon").instanceId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("target").instanceId)).toBe(
      deleted,
    );
    if (!deleted) expect(s.perm("target").currentDP).toBe(5000);
    expect(s.state.memory).toBe(3);
  });

  it("plays a low-cost CS card and applies the mandatory scaled DP reduction", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions as any[];
      expect(actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true });
      expect(actions[1]).toMatchObject({ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" });
      expect(actions[1].optional).toBeUndefined();
      expect(actions[1].scaling.filter.nameOrTrait).toEqual([{ tokens: ["Hudie"], match: "trait" }]);
    }
  });

  it("reactivates the On Play effects with the printed CS Tamer return cost", () => {
    const action = compiled.effects.find((effect) => effect.trigger === "WhenAttacking")?.actions?.[0] as any;
    expect(action).toMatchObject({
      kind: "ReactivateEffect",
      fromTrigger: "OnPlay",
      count: 1,
      optional: true,
      cost: { kind: "return" },
    });
  });

  it("carries both exact alternate digivolution paths and the four-Hudie-Tamer gate", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, traits: ["CS"], cost: 4, isAlternate: true },
      {
        namesExact: ["Erika Mishima"],
        cost: 3,
        isAlternate: true,
        controllerControls: { kind: ["Tamer"], traits: ["Hudie"], min: 4 },
      },
    ]);
  });

  it("declines the optional CS play but still applies the mandatory DP tail to one target", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          hand: [
            { card: "BT23-101", as: "hudiemon" },
            { card: "BT23-010", as: "freeCs" },
          ],
          battleArea: [
            { card: "BT23-040", as: "hudie" },
            { card: "BT23-084", as: "hudieTamer" },
          ],
        },
        1: {
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          battleArea: [
            { card: "BT23-102", as: "target" },
            { card: "BT23-040", as: "opponentHudie" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    // Q5571: exactly ONE opposing Digimon is reduced. Pinning the target makes the untouched
    // opponent Hudie below a real single-target assertion rather than candidate order.
    preferInstanceIds.push(s.perm("target").topCard.instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hudiemon").instanceId })).toEqual({
      ok: true,
    });
    // Wait for the LAST endpoint of the chain (the mandatory DP tail), not the first mutation.
    await settle(() => s.perm("target").currentDP === 7000 && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("freeCs").instanceId);
    // Two friendly Hudie DIGIMON (the entering Hudiemon and Wormmon); the Hudie Tamer and the
    // opponent's Hudie Digimon do not scale it. 13000 - 2 x 3000.
    expect(s.perm("target").currentDP).toBe(7000);
    expect(s.perm("opponentHudie").currentDP).toBe(3000);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("hudiemon").instanceId),
    ).toBe(true);
  });

  it.each([
    ["cost-5 CS", "BT23-010", true, "hand"],
    ["cost-6 CS", "BT23-008", false, "hand"],
    ["cost-5 non-CS", "BT1-010", false, "hand"],
    ["cost-5 CS in trash", "BT23-010", false, "trash"],
  ] as const)("public On Play entry boundary: %s", async (_label, candidate, allowed, zone) => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          hand: [
            { card: "BT23-101", as: "hudiemon" },
            ...(zone === "hand" ? [{ card: candidate, as: "candidate" }] : []),
          ],
          trash: zone === "trash" ? [{ card: candidate, as: "candidate" }] : [],
        },
        1: { deck: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hudiemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("hudiemon").instanceId),
    );
    expect(s.state.memory).toBe(3);
    const inBattle = s.state.players[0]!.battleArea.some(
      ({ topCard }) => topCard?.instanceId === s.inst("candidate").instanceId,
    );
    expect(inBattle).toBe(allowed);
    if (allowed)
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(
        s.inst("candidate").instanceId,
      );
    else
      expect((s.state.players[0]![zone] as any[]).map(({ instanceId }) => instanceId)).toContain(
        s.inst("candidate").instanceId,
      );
  });

  it("publicly digivolves from a CS level-3 with cost 4 and rejects non-CS or wrong-level bases", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          battleArea: [
            { card: "BT23-017", as: "csBase" },
            { card: "BT23-040", as: "hudieAlly" },
          ],
          hand: [
            { card: "BT23-101", as: "hudiemon" },
            { card: "BT23-010", as: "freeCs" },
          ],
        },
        1: {
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          battleArea: [{ card: "BT23-102", as: "target", suspended: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("csBase").permanentId,
        instanceId: s.inst("hudiemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("csBase").topCard.instanceId === s.inst("hudiemon").instanceId);
    expect(s.perm("csBase").stack.map(({ cardId }) => cardId)).toEqual(["BT23-017"]);
    expect(s.state.memory).toBe(0);
    expect(s.perm("target").currentDP).toBe(7000);
    for (const base of ["BT1-010", "BT23-008"] as const) {
      const bad = setupEngine({
        0: {
          deck: ["BT1-009"],
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "BT23-101", as: "hudiemon" }],
        },
      });
      await bad.ready();
      expect(
        bad.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: bad.perm("base").permanentId,
          instanceId: bad.inst("hudiemon").instanceId,
        }),
      ).toEqual({ ok: false, reason: "invalid-evolution" });
      expect(bad.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(bad.inst("hudiemon").instanceId);
    }
  });

  it("uses a public attack to return a CS Tamer and reactivate On Play without memory payment", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          battleArea: [
            { card: "BT23-101", as: "attacker" },
            { card: "BT23-040", as: "hudie" },
            { card: "BT23-084", as: "tamer" },
          ],
          hand: [{ card: "BT23-010", as: "freeCs" }],
        },
        // BT10-055 is an inert 13000-DP body. BT23-102 (the obvious 13000 stand-in) carries
        // "[All Turns] when security stacks are removed from, place 1 Digimon as the bottom
        // security card", which this attack's security check fires: it removes ITSELF from the
        // board and the -6000 endpoint can no longer be read.
        1: {
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
          battleArea: [{ card: "BT10-055", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance" } as never)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("tamer").instanceId));
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("tamer").instanceId);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("freeCs").instanceId),
    ).toBe(true);
    expect(s.state.memory).toBe(10);
    expect(s.perm("target").currentDP).toBe(7000);
  });

  it("uses the public Erika Mishima cost-3 evolution only with four friendly Hudie Tamers", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        battleArea: [
          { card: "BT23-084", as: "erika" },
          { card: "BT23-084", as: "erika2" },
          { card: "BT23-084", as: "erika3" },
          { card: "BT23-084", as: "erika4" },
        ],
        hand: [{ card: "BT23-101", as: "hudiemon" }],
      },
      1: { deck: ["BT1-009", "BT1-009"], battleArea: [{ card: "BT23-102", as: "target" }] },
    });
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("erika").permanentId,
        instanceId: s.inst("hudiemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("erika").topCard.instanceId === s.inst("hudiemon").instanceId);
    expect(s.perm("erika").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("erika").instanceId);
    expect(s.perm("erika").topCard.cardId).toBe("BT23-101");
    expect(s.state.memory).toBe(0);
    // Q6709: a digivolution bonus draw happens for a Tamer-origin digivolution too.
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.perm("target").currentDP).toBe(10000);
    // Q6712: Hudiemon gains Erika's inherited text from this real evolution, so it now
    // carries a SECOND ＜Alliance＞ on top of its printed one.
    expect(observe(s.engine).hasKeyword(s.perm("erika"), "Alliance")).toBe(true);
  });

  it("projects Alliance from Erika as an inherited source while retaining Hudiemon's own Alliance", async () => {
    const s = setupEngine({
      0: { deck: ["BT1-009"], battleArea: [{ card: "BT23-101", as: "carrier", under: ["BT23-084"] }] },
      1: { deck: ["BT1-009"] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("carrier"), "Alliance")).toBe(true);
  });

  it("rejects four Hudie Tamers when the source name is not Erika, and does not count an opponent's Hudie Tamer", async () => {
    const wrong = setupEngine({
      0: {
        deck: ["BT1-009", "BT1-009"],
        battleArea: ["BT23-081", "BT23-081", "BT23-081", "BT23-081"].map((card, i) => ({ card, as: `tamer${i}` })),
        hand: [{ card: "BT23-101", as: "hudiemon" }],
      },
    });
    await wrong.ready();
    expect(
      wrong.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrong.perm("tamer0").permanentId,
        instanceId: wrong.inst("hudiemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    const opponent = setupEngine({
      0: {
        deck: ["BT1-009", "BT1-009"],
        battleArea: ["BT23-084", "BT23-084", "BT23-084"].map((card, i) => ({ card, as: `own${i}` })),
        hand: [{ card: "BT23-101", as: "hudiemon" }],
      },
      1: { deck: ["BT1-009"], battleArea: [{ card: "BT23-084", as: "opponentErika" }] },
    });
    await opponent.ready();
    expect(
      opponent.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: opponent.perm("own0").permanentId,
        instanceId: opponent.inst("hudiemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("declines attack reactivation when no friendly CS Tamer is available", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-009"],
          battleArea: [{ card: "BT23-101", as: "attacker" }],
          hand: [{ card: "BT23-010", as: "freeCs" }],
        },
        1: { deck: ["BT1-009", "BT1-009"], security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("freeCs").instanceId);
  });

  it("limits attack reactivation to once per turn and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          battleArea: [
            { card: "BT23-101", as: "attacker" },
            { card: "BT23-040", as: "hudie" },
            { card: "BT23-084", as: "tamer1" },
            { card: "BT23-084", as: "tamer2" },
          ],
          hand: [
            { card: "BT23-010", as: "freeCs1" },
            { card: "BT23-010", as: "freeCs2" },
          ],
        },
        1: {
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          // Main-deck Digimon, never Digi-Eggs: a Digi-Egg is not a legal security card.
          security: ["BT1-009", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    const attack = async () => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => combat.hasOpenAllianceDecision);
      expect(s.engine.applyIntent(0, { type: "respondAlliance" } as never)).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
    };
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const memory = s.state.memory;
    await attack();
    const handAfterFirst = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    expect(
      [s.inst("tamer1").instanceId, s.inst("tamer2").instanceId].filter((id) => handAfterFirst.includes(id)),
    ).toHaveLength(1);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("freeCs1").instanceId),
    ).toBe(true);
    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    await attack();
    const handAfterSecond = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    expect(
      [s.inst("tamer1").instanceId, s.inst("tamer2").instanceId].filter((id) => handAfterSecond.includes(id)),
    ).toHaveLength(1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("freeCs2").instanceId);
    expect(s.state.memory).toBe(memory);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    // No manual unsuspend here: the real Unsuspend phase must have readied the attacker.
    await attack();
    const handAfterReset = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    expect(
      [s.inst("tamer1").instanceId, s.inst("tamer2").instanceId].filter((id) => handAfterReset.includes(id)),
    ).toHaveLength(2);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("freeCs2").instanceId),
    ).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("triggers a 'when any of your Digimon digivolve' watcher from a CS Digimon base", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          battleArea: [
            { card: "BT23-017", as: "csBase" },
            { card: "BT23-082", as: "makiko" },
          ],
          hand: [
            { card: "BT23-101", as: "hudiemon" },
            // Two level-3 CS bodies: Hudiemon's own [When Digivolving] free play consumes one,
            // Makiko's watcher needs the other, so an empty hand cannot hide a missing trigger.
            { card: "BT23-017", as: "watcherPlay" },
            { card: "BT23-017", as: "watcherPlay2" },
          ],
        },
        1: { deck: ["BT1-009", "BT1-010"], battleArea: [{ card: "BT10-055", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("csBase").permanentId,
        instanceId: s.inst("hudiemon").instanceId,
      }),
    ).toEqual({ ok: true });
    // Makiko Date watches "when any of your Digimon digivolve into a [CS] Digimon" and pays
    // by returning herself to the hand.
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("makiko").instanceId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("makiko").instanceId);
    expect(s.perm("csBase").topCard.instanceId).toBe(s.inst("hudiemon").instanceId);
  });

  // Q6708: digivolving from a Tamer is not a Digimon digivolving, so a "when any of your
  // Digimon digivolve" watcher must not fire. Fixed in engine lane 6: both WhenDigivolving
  // fire sites read `digivolvedFromTamerBase` and withhold `whenOneOfYoursDigivolves` /
  // `whenAnyDigivolves` for a Tamer base, so Makiko Date (BT23-082) stays on the field while
  // Hudiemon's own [When Digivolving] timing and the bonus draw (Q6709) still apply.
  it("does not trigger a Digimon-digivolution watcher when digivolving from the Erika Tamer (Q6708)", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          battleArea: [
            { card: "BT23-084", as: "erika" },
            { card: "BT23-084", as: "erika2" },
            { card: "BT23-084", as: "erika3" },
            { card: "BT23-084", as: "erika4" },
            { card: "BT23-082", as: "makiko" },
          ],
          hand: [
            { card: "BT23-101", as: "hudiemon" },
            { card: "BT23-017", as: "watcherPlay" },
            { card: "BT23-017", as: "watcherPlay2" },
          ],
        },
        1: { deck: ["BT1-009", "BT1-010"], battleArea: [{ card: "BT10-055", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("erika").permanentId,
        instanceId: s.inst("hudiemon").instanceId,
      }),
    ).toEqual({ ok: true });
    // Q6708: the Tamer digivolves as a Tamer. Watchers that require a DIGIMON to digivolve
    // must not fire, so Makiko stays on the field. Hudiemon's own entry timing is retained
    // (its mandatory DP tail below), which is the distinction the coordinator asked for.
    await settle(() => s.perm("erika").topCard.instanceId === s.inst("hudiemon").instanceId);
    await settle(() => s.state.pendingDecision === undefined);
    // Hudiemon's own entry timing IS retained after a Tamer-origin digivolution: it plays one
    // Betamon for free, then counts both battle-area Hudie Digimon: 13000 - 2 x 3000.
    // These assertions pass today and are exercised before the failing one below.
    expect(s.perm("erika").topCard.cardId).toBe("BT23-101");
    expect(s.perm("erika").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("erika").instanceId);
    const betamons = [s.inst("watcherPlay").instanceId, s.inst("watcherPlay2").instanceId];
    expect(
      betamons.filter((id) => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === id)),
    ).toHaveLength(1);
    expect(s.perm("target").currentDP).toBe(7000);
    // The failing endpoint: Makiko Date must NOT have paid her return cost.
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("makiko").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("makiko").instanceId);
  });

  it("trashes the Erika digivolution card when Hudiemon leaves the battle area (Q6710)", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          battleArea: [
            { card: "BT23-084", as: "erika" },
            { card: "BT23-084", as: "erika2" },
            { card: "BT23-084", as: "erika3" },
            { card: "BT23-084", as: "erika4" },
          ],
          hand: [{ card: "BT23-101", as: "hudiemon" }],
        },
        1: { deck: ["BT1-009", "BT1-010"], battleArea: [{ card: "BT10-055", as: "blocker", suspended: true }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("erika").permanentId,
        instanceId: s.inst("hudiemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("erika").topCard.instanceId === s.inst("hudiemon").instanceId);
    const attackerPermanentId = s.perm("erika").permanentId;
    // 7000 attacker into a 13000 body: Hudiemon loses the battle and is deleted.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId,
        target: { kind: "digimon", permanentId: s.perm("blocker").permanentId },
      } as never),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerPermanentId) &&
        s.state.pendingDecision === undefined,
    );
    const trash = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);
    // Q6710: the Tamer under the Digimon is a digivolution card and is trashed like one.
    expect(trash).toContain(s.inst("erika").instanceId);
    expect(trash).toContain(s.inst("hudiemon").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("erika").instanceId);
  });

  it("counts only battle-area Hudie Digimon, never one in the breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          hand: [{ card: "BT23-101", as: "hudiemon" }],
          // CR 3-4-5-8: information on cards in the breeding area cannot be referenced.
          breeding: { card: "BT23-040", as: "breedingHudie" },
        },
        1: { deck: ["BT1-009", "BT1-010"], battleArea: [{ card: "BT10-055", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hudiemon").instanceId })).toEqual({
      ok: true,
    });
    // Only the entering Hudiemon counts: 13000 - 1 x 3000.
    await settle(() => s.perm("target").currentDP === 10000 && s.state.pendingDecision === undefined);
    expect(s.perm("target").currentDP).toBe(10000);
    expect(s.perm("breedingHudie").inBreeding).toBe(true);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("never reduces the DP of an opponent's breeding-area Digimon", async () => {
    const s = setupEngine(
      {
        0: { deck: ["BT1-009", "BT1-010", "BT1-011"], hand: [{ card: "BT23-101", as: "hudiemon" }] },
        1: { deck: ["BT1-009", "BT1-010"], breeding: { card: "BT23-040", as: "opponentBreeding" } },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hudiemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("hudiemon").instanceId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.perm("opponentBreeding").currentDP).toBe(3000);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("orders two Alliance instances with the When Attacking effect and applies both bonuses (Q5257)", async () => {
    let attackerDpDuringBattle = 0;
    let attackerPermanentId = "";
    const s: ReturnType<typeof setupEngine> = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          battleArea: [
            // Erika Mishima under Hudiemon grants a SECOND ＜Alliance＞ ([Your Turn] while
            // this Digimon is [Hudiemon]); the printed one is the first.
            { card: "BT23-101", as: "attacker", under: ["BT23-084"] },
            { card: "BT23-040", as: "ally", dp: 3000 },
            { card: "BT23-084", as: "tamer" },
          ],
          hand: [{ card: "BT23-010", as: "freeCs" }],
        },
        1: {
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: [
            { card: "BT1-009", as: "sec0" },
            { card: "BT1-010", as: "sec1" },
            { card: "BT1-011", as: "sec2" },
            { card: "BT1-012", as: "sec3" },
            { card: "BT1-013", as: "sec4" },
          ],
          battleArea: [{ card: "BT10-055", as: "target" }],
        },
      },
      {
        autoOrderTriggers: false,
        autoAcceptOptional: true,
        autoSelectCards: true,
        onEvent: () => {
          const attacker = s?.state.players[0]?.battleArea.find(
            ({ permanentId }) => permanentId === attackerPermanentId,
          );
          if (attacker !== undefined) attackerDpDuringBattle = Math.max(attackerDpDuringBattle, attacker.currentDP);
        },
      },
    );
    await s.ready();
    attackerPermanentId = s.perm("attacker").permanentId;
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    const takeTrigger = async (match: (key: string) => boolean): Promise<string[]> => {
      await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
      const decision = s.state.pendingDecision!;
      const keys = (JSON.parse(decision.payloadJson) as { triggerKeys: string[] }).triggerKeys;
      const chosen = keys.find(match);
      expect(chosen).toBeDefined();
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "orderTriggers", order: [chosen!] },
        }),
      ).toEqual({ ok: true });
      return keys;
    };
    const answerAlliance = async (allyPermanentId: string): Promise<void> => {
      await settle(() => combat.hasOpenAllianceDecision);
      expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId } as never)).toEqual({ ok: true });
    };
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    // All three triggers are offered in ONE simultaneous-trigger window.
    const firstKeys = await takeTrigger((key) => key.includes("/alliance/"));
    expect(new Set(firstKeys).size).toBe(firstKeys.length);
    expect(firstKeys.filter((key) => key.includes("/alliance/"))).toHaveLength(2);
    expect(firstKeys.filter((key) => !key.includes("/alliance/"))).toHaveLength(1);

    // 1st ＜Alliance＞: suspend Wormmon. +3000 DP and one extra security check.
    await answerAlliance(s.perm("ally").permanentId);
    await settle(() => s.perm("ally").isSuspended);
    expect(s.perm("ally").isSuspended).toBe(true);

    // [When Attacking]: return the CS Tamer, replay [On Play], play GeoGreymon for free.
    await takeTrigger((key) => !key.includes("/alliance/"));
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("freeCs").instanceId),
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("tamer").instanceId);
    // Two battle-area Hudie Digimon (Hudiemon and Wormmon): 13000 - 2 x 3000.
    expect(s.perm("target").currentDP).toBe(7000);

    // 2nd ＜Alliance＞ resolves after the derived play and can suspend the new arrival.
    await answerAlliance(s.perm("freeCs").permanentId);
    await settle(() => s.perm("freeCs").isSuspended);
    expect(s.perm("freeCs").isSuspended).toBe(true);

    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    // 7000 printed + 3000 (Wormmon) + 5000 (GeoGreymon) from the two Alliance bonuses.
    expect(attackerDpDuringBattle).toBe(15000);
    // One base security check plus one per Alliance instance: 5 - 3 = 2.
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("sec3").instanceId,
      s.inst("sec4").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not let Hudiemon attack after evolving a newly played Erika Tamer", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        battleArea: [
          { card: "BT23-084", as: "hudie1" },
          { card: "BT23-084", as: "hudie2" },
          { card: "BT23-084", as: "hudie3" },
        ],
        hand: [
          { card: "BT23-084", as: "newErika" },
          { card: "BT23-101", as: "hudiemon" },
        ],
      },
      1: { deck: ["BT1-009", "BT1-010"], security: ["BT1-009", "BT1-009", "BT1-009"] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("newErika").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("newErika").topCard.instanceId === s.inst("newErika").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("newErika").permanentId,
        instanceId: s.inst("hudiemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("newErika").topCard.instanceId === s.inst("hudiemon").instanceId);
    expect(s.perm("newErika").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("newErika").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("newErika").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });
  // Q6708, second half: "if a 'Digimon can't digivolve' effect has activated, you can still
  // digivolve from a Tamer with this digivolve requirement". BT13-007 King Drasil_7D6 in the
  // breeding area publishes "[Breeding][Your Turn] All of your Digimon can't digivolve."
  it("keeps the Erika Tamer route legal while a 'Digimon can't digivolve' restriction blocks the Digimon route (Q6708)", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        breeding: { card: "BT13-007", as: "drasil" },
        battleArea: [
          { card: "BT23-017", as: "betamon" },
          { card: "BT23-084", as: "erika" },
          { card: "BT23-084", as: "erika2" },
          { card: "BT23-084", as: "erika3" },
          { card: "BT23-084", as: "erika4" },
        ],
        hand: [{ card: "BT23-101", as: "hudiemon" }],
      },
      1: { deck: ["BT1-009", "BT1-010"] },
    });
    await s.ready();
    s.state.memory = 6;
    // Control: the printed Lv.3 w/[CS] route onto a Digimon base is blocked by the restriction.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("betamon").permanentId,
        instanceId: s.inst("hudiemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("betamon").topCard.cardId).toBe("BT23-017");
    // The Tamer route is unaffected: a Tamer is not "your Digimon".
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("erika").permanentId,
        instanceId: s.inst("hudiemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("erika").topCard.instanceId === s.inst("hudiemon").instanceId);
    expect(s.perm("erika").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("erika").instanceId);
    expect(s.state.memory).toBe(3);
  });

  // Q6708, watcher half, second watcher shape (BT5-091 Takumi Aiba, "[Your Turn] When one of
  // your Digimon digivolves, you may suspend this Tamer to trigger <Draw 1>").
  it.each([
    ["Digimon base fires the watcher", "betamon", true],
    ["Erika Tamer base does not (Q6708)", "erika", false],
  ] as const)("a second 'when one of your Digimon digivolves' watcher: %s", async (_label, baseAlias, fires) => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          battleArea: [
            { card: "BT5-091", as: "takumi" },
            { card: "BT23-017", as: "betamon" },
            { card: "BT23-084", as: "erika" },
            { card: "BT23-084", as: "erika2" },
            { card: "BT23-084", as: "erika3" },
            { card: "BT23-084", as: "erika4" },
          ],
          hand: [{ card: "BT23-101", as: "hudiemon" }],
        },
        1: { deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 6;
    const deckBefore = s.state.players[0]!.deck.length;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm(baseAlias).permanentId,
        instanceId: s.inst("hudiemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm(baseAlias).topCard.instanceId === s.inst("hudiemon").instanceId && s.state.pendingDecision === undefined,
    );
    // The digivolution bonus draw (Q6709) always happens; the watcher draw is the extra one.
    expect(deckBefore - s.state.players[0]!.deck.length).toBe(fires ? 2 : 1);
    expect(s.perm("takumi").isSuspended).toBe(fires);
  });
});
