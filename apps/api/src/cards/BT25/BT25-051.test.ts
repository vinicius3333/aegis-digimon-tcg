import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_051 } from "./BT25-051.js";
import "../index.js";

describe("BT25-051 Grizzlymon", () => {
  it("matches the catalog identity and every printed clause", () => {
    expect(getCardDefinition("BT25-051")).toMatchObject({
      cardId: "BT25-051",
      nameEn: "Grizzlymon",
      colors: ["Green", "Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [
        { color: "Green", level: 3, memoryCost: 3 },
        { color: "Black", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Beast", "Iliad", "TS"],
      rarity: "C",
      maxCountInDeck: 4,
      dualEffect: "Grizzlymon",
    });
    expect(BT25_051.effects?.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "Blocker", raw: "＜Blocker＞" },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(BT25_051.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "ModifyDP",
        amount: 3000,
        duration: "untilOpponentTurnEnd",
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              { tokens: ["Beast", "Animal", "Sovereign"], match: "trait" },
              { tokens: ["Shaman", "TS"], match: "trait" },
            ],
            excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
          },
        },
      });
    }
    const inherited = BT25_051.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
    expect(inherited?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenBattleWon",
      sourceFilter: { isSelfRef: true },
    });
  });

  it("naturally gives one eligible allied Digimon +3000 DP and excludes a near-match", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-051", as: "grizzly" }],
          battleArea: [
            { card: "BT25-047", as: "eligible" },
            { card: "BT25-046", as: "nearMatch" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("eligible").permanentId);
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grizzly").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("eligible").currentDP === 5000);

    expect(s.perm("eligible").currentDP).toBe(5000);
    expect(s.perm("nearMatch").currentDP).toBe(2000);
  });

  it("keeps the target to its controller, kind, and Sea Animal boundaries", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-051", as: "grizzly" }],
          battleArea: [
            { card: "BT1-031", as: "ownBeast" },
            { card: "BT14-008", as: "ownSeaAnimal" },
          ],
        },
        1: { battleArea: [{ card: "BT1-031", as: "opponentBeast" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ownBeast").permanentId);
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grizzly").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ownBeast").currentDP === 4000);

    expect(s.perm("ownBeast").currentDP).toBe(4000);
    expect(s.perm("ownSeaAnimal").currentDP).toBe(2000);
    expect(s.perm("opponentBeast").currentDP).toBe(1000);
  });

  it("applies the same target filter after a public When Digivolving", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-047", as: "source" },
            { card: "BT25-047", as: "eligible" },
            { card: "BT25-046", as: "nearMatch" },
          ],
          hand: [{ card: "BT25-051", as: "grizzly" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("eligible").permanentId);
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("grizzly").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("eligible").currentDP === 6000);
    expect(s.perm("eligible").currentDP).toBe(6000);
    expect(s.perm("nearMatch").currentDP).toBe(3000);
  });

  it("supports the public TS alternate evolution from a level 3 source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-009", as: "source" }], hand: [{ card: "BT25-051", as: "grizzly" }] },
    });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("grizzly").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT25-051");
    expect(s.state.memory).toBe(0);
  });

  it.each([
    ["green", "BT25-047"],
    ["black", "BT25-062"],
  ])("supports the normal %s level-3 evolution route", async (_route, source) => {
    const s = setupEngine({
      0: { battleArea: [{ card: source, as: "source" }], hand: [{ card: "BT25-051", as: "grizzly" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("grizzly").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT25-051");
    expect(s.state.memory).toBe(2);
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual([source]);
  });

  it("naturally draws when the Digimon carrying Grizzlymon wins a battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT25-055",
              as: "attacker",
              under: [{ card: "BT25-051", as: "inherited" }],
            },
          ],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand).toContainEqual(s.inst("drawn"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("draws when the inherited Grizzlymon wins a Security battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-055", as: "attacker", under: [{ card: "BT25-051", as: "inherited" }], dp: 12000 }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
      1: { security: [{ card: "BT1-009", as: "security" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("does not draw when the inherited Grizzlymon loses", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-055", as: "attacker", under: [{ card: "BT25-051", as: "inherited" }], dp: 1000 }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "loss", suspended: true, dp: 5000 },
            { card: "BT1-013", as: "win", suspended: true, dp: 3000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: s.perm("loss").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId)).toBe(false);
  });

  it("suppresses the inherited draw on a second same-turn win and resets next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-055", as: "winner", under: [{ card: "BT25-051", as: "inherited" }], dp: 12000 }],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", suspended: true, dp: 3000 },
            { card: "BT1-013", as: "second", suspended: true, dp: 3000 },
            { card: "BT1-014", as: "future", suspended: true, dp: 8000 },
          ],
          deck: ["BT1-005", "BT1-006"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const winnerId = s.perm("winner").permanentId;
    const attack = async (target: string) => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: winnerId,
          target: { kind: "permanent", permanentId: target },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
    };
    await attack(s.perm("first").permanentId);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    await advance(s.engine).verb.unsuspend([winnerId]);
    await attack(s.perm("second").permanentId);
    expect(s.state.players[0]!.hand).toHaveLength(1);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("future").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("future").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 10;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("winner").isSuspended).toBe(false);
    await attack(s.perm("future").permanentId);
    expect(s.state.players[0]!.hand).toHaveLength(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("orders the turn-player battle-win draw before loser On Deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-055", as: "winner", under: ["BT25-051"], dp: 12000 }], deck: ["BT1-001"] },
      1: { battleArea: [{ card: "BT1-035", as: "loser", under: ["BT1-030"], suspended: true, dp: 5000 }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("winner").permanentId,
        target: { kind: "permanent", permanentId: s.perm("loser").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.hand.length === 1);
    const battleWin = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT25-051",
    );
    const loserOnDeletion = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT1-030",
    );
    expect(battleWin).toBeGreaterThanOrEqual(0);
    expect(loserOnDeletion).toBeGreaterThan(battleWin);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-035")).toBe(false);
  });

  it("draws after a battle win even when Armor Purge prevents the loser deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-055", as: "winner", under: ["BT25-051"], dp: 12000 }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT10-074", as: "purge", under: ["BT10-073"], suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("winner").permanentId,
        target: { kind: "permanent", permanentId: s.perm("purge").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("winner").permanentId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("purge").permanentId)).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT10-074");
    const armorPurgeCost = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.instanceIds.includes(s.inst("purge").instanceId),
    );
    const battleWin = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT25-051",
    );
    expect(armorPurgeCost).toBeGreaterThanOrEqual(0);
    expect(battleWin).toBeGreaterThan(armorPurgeCost);
  });
});
