import type { Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle, type CardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-055.js";
import "../BT1/BT1-070.js";
import "../BT15/BT15-038.js";
import "../BT8/BT8-031.js";
import "./ST23-04.js";
import "./ST23-09.js";
import "../EX12/EX12-052.js";
import "../BT19/BT19-089.js";
import "../BT1/BT1-079.js";
import "../BT26/BT26-056.js";
import "../BT26/BT26-057.js";
import "../BT26/BT26-032.js";
import "../BT24/BT24-102.js";

describe("ST23-09 Atratusmon", () => {
  it("deletes the opponent's lowest-DP Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST23-08", as: "base" }],
          hand: [{ card: "ST23-09", as: "fenriloogamon" }],
          deck: ["BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 3000 },
            { card: "BT1-009", as: "high", dp: 5000 },
          ],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const lowId = s.perm("low").topCard!.instanceId;
    const highId = s.perm("high").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("fenriloogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "ST23-09" && s.state.players[1]!.battleArea.length === 1);
    expect(s.perm("base").topCard?.cardId).toBe("ST23-09");
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === lowId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === highId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === lowId)).toBe(true);
  });

  it("exposes Security Attack +1, Reboot, and Blocker on its Digimon side", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST23-09", as: "atratusmon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("atratusmon"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("atratusmon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("atratusmon"), "Blocker")).toBe(true);
  });

  it("keeps shared once-per-turn immunity/deletion and the Option-side highest-DP return", () => {
    const card = runtimeCompiledCard("ST23-09");
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      expect(card?.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", duration: "untilOpponentTurnEnd" },
          { kind: "Delete", target: { filter: { superlative: "lowestDP" } } },
        ],
      });
    }
    expect(card?.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] } } },
        {
          kind: "Return",
          to: "deckBottom",
          target: { filter: { controller: "opponent", suspended: true, superlative: "highestDP" } },
        },
      ],
    });
  });

  it("uses Security Attack +1 in a real player attack and performs two checks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST23-09", as: "attacker" }] },
      1: { security: ["BT1-001", "BT1-002"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 2);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("uses Blocker in a real player attack and keeps the blocker after the unequal battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-11", as: "attacker" }] },
      1: { battleArea: [{ card: "ST23-09", as: "blocker" }], security: ["BT1-001"] },
    });
    const attackerId = s.perm("attacker").permanentId;
    const blockerId = s.perm("blocker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blockerId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.events.find((event) => event.kind === "combatResolved")).toMatchObject({
      deletedPermanentIds: [attackerId],
    });
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === blockerId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("uses Reboot to unsuspend the host during the opponent's active phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST23-09", as: "host", suspended: true }] },
      1: { deck: ["BT1-001", "BT1-002"] },
    });
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("host").isSuspended).toBe(false);
  });
});

function permanentIdsOf(s: EngineSetup, alias: string): string[] {
  const permanent = s.perm(alias);
  return [permanent.permanentId, permanent.topCard!.instanceId];
}

async function digivolveIntoImmuneAtratusmon(extra: { opponentHand?: CardSpec[] } = {}) {
  const preferInstanceIds: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "ST23-08", as: "atratusmon" },
          { card: "ST23-03", as: "ally", dp: 4000 },
        ],
        hand: [{ card: "ST23-09", as: "atratusmonCard" }],
        deck: ["BT1-002", "BT1-003"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "victim", dp: 1000 }],
        hand: extra.opponentHand ?? [],
        deck: ["BT1-002", "BT1-003"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
  );
  const victimId = s.perm("victim").permanentId;
  s.state.memory = 4;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("atratusmon").permanentId,
      instanceId: s.inst("atratusmonCard").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.perm("atratusmon").topCard?.cardId === "ST23-09" &&
      !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId),
  );
  return { s, preferInstanceIds };
}

async function duringMainPhase(s: EngineSetup, seat: Seat, memory: number, body: () => Promise<void>) {
  s.state.turnSeat = seat;
  s.state.memory = memory;
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(seat);
  await body();
  advance(s.engine).endMainPhaseIfOpen(seat);
  await turn;
}

async function opponentPlays(s: EngineSetup, alias: string) {
  const instanceId = s.inst(alias).instanceId;
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId));
  await settle();
}

describe("ST23-09 Atratusmon — KB Q&A rulings", () => {
  it("is used as a Glowing Dawn Option by an effect that uses [Glowing Dawn] trait Option cards (Q6174)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST23-13", as: "tamer", under: [{ card: "BT1-001", faceUp: false }] }],
          hand: [
            { card: "ST23-04", as: "murasamemon" },
            { card: "ST23-09", as: "atratusmon" },
          ],
          deck: ["BT1-002", "BT1-003"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 8000 }], deck: ["BT1-002"] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
        declinePrompts: ["Arts Digivolve"],
      },
    );
    const atratusmonId = s.inst("atratusmon").instanceId;
    const opponentTopId = s.perm("opponent").topCard!.instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("murasamemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.deck.some((card) => card.instanceId === opponentTopId));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(opponentTopId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === atratusmonId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === atratusmonId)).toBe(
      false,
    );
    expect(s.state.memory).toBe(10 - 7 - 2);
  });

  it("can be chosen by an opponent's Digimon effect but is not suspended by it (Q6175, Q6176)", async () => {
    const { s, preferInstanceIds } = await digivolveIntoImmuneAtratusmon({
      opponentHand: [{ card: "BT1-070", as: "suspender" }],
    });
    preferInstanceIds.push(...permanentIdsOf(s, "atratusmon"));
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const decisionsBefore = s.decisions.length;

    await opponentPlays(s, "suspender");

    const choice = s.decisions
      .slice(decisionsBefore)
      .find(({ seat, req }) => seat === 1 && req.kind === "chooseTargets");
    const offered = choice?.req.options?.candidateInstanceIds ?? [];
    expect(offered.some((id) => permanentIdsOf(s, "atratusmon").includes(id))).toBe(true);
    expect(offered.some((id) => permanentIdsOf(s, "ally").includes(id))).toBe(true);
    expect(s.perm("atratusmon").isSuspended).toBe(false);
    expect(s.perm("ally").isSuspended).toBe(false);
  });

  it("does not get -3000 DP from an opponent's Digimon effect that chose it (Q6175)", async () => {
    const { s, preferInstanceIds } = await digivolveIntoImmuneAtratusmon({
      opponentHand: [{ card: "BT1-055", as: "reducer" }],
    });
    preferInstanceIds.push(...permanentIdsOf(s, "atratusmon"));
    s.state.turnSeat = 1;
    s.state.memory = 10;

    const decisionsBefore = s.decisions.length;

    await opponentPlays(s, "reducer");

    const choice = s.decisions
      .slice(decisionsBefore)
      .find(({ seat, req }) => seat === 1 && req.kind === "chooseTargets");
    expect(
      (choice?.req.options?.candidateInstanceIds ?? []).some((id) => permanentIdsOf(s, "atratusmon").includes(id)),
    ).toBe(true);
    expect(s.perm("atratusmon").currentDP).toBe(12000);
    expect(s.perm("ally").currentDP).toBe(4000);
  });

  it("stops getting -6000 DP from an opponent's Digimon effect as soon as it gains the immunity (Q6178)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST23-09", as: "atratusmon" },
            { card: "BT1-009", as: "ally", dp: 8000 },
          ],
          deck: ["BT1-002", "BT1-003"],
        },
        1: {
          hand: [
            { card: "BT15-038", as: "firstReducer" },
            { card: "BT15-038", as: "secondReducer" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
          deck: ["BT1-005", "BT1-006", "BT1-007"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds },
    );
    s.state.isFirstPlayersFirstTurn = false;
    await s.ready();

    await duringMainPhase(s, 1, 10, async () => {
      preferInstanceIds.push(...permanentIdsOf(s, "atratusmon"));
      await opponentPlays(s, "firstReducer");
      preferInstanceIds.splice(0, preferInstanceIds.length, ...permanentIdsOf(s, "ally"));
      await opponentPlays(s, "secondReducer");
    });

    await duringMainPhase(s, 0, 3, async () => {
      expect(s.perm("atratusmon").currentDP).toBe(6000);
      expect(s.perm("ally").currentDP).toBe(2000);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("atratusmon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("atratusmon").immuneToOpponentDigimonEffects);

      expect(s.perm("atratusmon").currentDP).toBe(12000);
      expect(s.perm("ally").currentDP).toBe(2000);
      await advance(s.engine).finishAttack();
    });
  });

  it("gets -6000 DP it was given while immune as soon as the immunity ends (Q6179)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST23-08", as: "atratusmon" },
            { card: "BT1-009", as: "ally", dp: 8000 },
          ],
          hand: [{ card: "ST23-09", as: "atratusmonCard" }],
          deck: ["BT1-002", "BT1-003", "BT1-004"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim", dp: 1000 }],
          hand: [{ card: "BT15-038", as: "reducer" }, "BT1-010"],
          security: ["BT1-001", "BT1-002", "BT1-003"],
          deck: ["BT1-005", "BT1-006", "BT1-007"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds },
    );
    const victimId = s.perm("victim").permanentId;
    s.state.isFirstPlayersFirstTurn = false;
    await s.ready();

    await duringMainPhase(s, 0, 4, async () => {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("atratusmon").permanentId,
          instanceId: s.inst("atratusmonCard").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId));
    });

    await duringMainPhase(s, 1, 10, async () => {
      preferInstanceIds.push(...permanentIdsOf(s, "atratusmon"));
      const decisionsBefore = s.decisions.length;
      await opponentPlays(s, "reducer");
      const choice = s.decisions
        .slice(decisionsBefore)
        .find(({ seat, req }) => seat === 1 && req.kind === "chooseTargets");
      expect(
        (choice?.req.options?.candidateInstanceIds ?? []).some((id) => permanentIdsOf(s, "atratusmon").includes(id)),
      ).toBe(true);
      expect(s.perm("atratusmon").immuneToOpponentDigimonEffects).toBe(true);
      expect(s.perm("atratusmon").currentDP).toBe(12000);
    });

    await duringMainPhase(s, 0, 3, async () => {
      expect(s.perm("atratusmon").immuneToOpponentDigimonEffects).toBe(false);
      expect(s.perm("atratusmon").currentDP).toBe(6000);
      expect(s.perm("ally").currentDP).toBe(8000);
    });
  });

  it("is given an opponent Digimon's [When Attacking] effect but neither has it trigger nor is affected (Q6177, Q6180)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST23-08", as: "atratusmon", under: [{ card: "BT1-001", as: "atratusmonBottom" }] },
            { card: "BT1-014", as: "ally", under: [{ card: "BT1-002", as: "allyBottom" }, "BT1-003"] },
          ],
          hand: [{ card: "ST23-09", as: "atratusmonCard" }],
          deck: ["BT1-004", "BT1-005"],
        },
        1: {
          battleArea: [
            { card: "BT8-031", as: "frosVelgrmon" },
            { card: "BT1-009", as: "victim", dp: 1000 },
          ],
          security: ["BT1-006", "BT1-007", "BT1-008", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const grants = () =>
      (
        s.engine as unknown as {
          continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
        }
      ).continuous.listCustomEffectGrants();
    const grantedToTopOf = (alias: string) =>
      grants().some(
        (grant) =>
          grant.instanceId === s.perm(alias).topCard!.instanceId &&
          grant.token === "[When Attacking] Trash the bottom digivolution card of this Digimon.",
      );
    const attackPlayer = async (alias: string) => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm(alias).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "securityChecked"));
      await advance(s.engine).finishAttack();
    };
    const victimId = s.perm("victim").permanentId;
    const atratusmonBottomId = s.inst("atratusmonBottom").instanceId;
    const allyBottomId = s.inst("allyBottom").instanceId;
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("atratusmon").permanentId,
        instanceId: s.inst("atratusmonCard").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("atratusmon").immuneToOpponentDigimonEffects &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId),
    );
    await s.engine.recomputeContinuousEffects();
    expect(grantedToTopOf("atratusmon")).toBe(true);
    expect(grantedToTopOf("ally")).toBe(true);

    await attackPlayer("atratusmon");
    expect(s.perm("atratusmon").stack.map((card) => card.instanceId)).toContain(atratusmonBottomId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === atratusmonBottomId)).toBe(false);

    await attackPlayer("ally");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === allyBottomId));
    expect(s.perm("ally").stack.map((card) => card.instanceId)).not.toContain(allyBottomId);
  });
});

describe("Discord bug 1555938104404348949 — DUAL Option provenance", () => {
  it.each([
    { optionCard: "ST23-09", onField: false, suspended: false, attacksAtMain: false, deckBottom: true },
    { optionCard: "EX12-052", onField: true, suspended: true, attacksAtMain: false, deckBottom: false },
    { optionCard: "BT26-057", onField: true, suspended: false, attacksAtMain: true, deckBottom: false },
  ])(
    "1555938104404348949: $optionCard Option affects Diarbbitmon despite Digimon-effect immunity",
    async ({ optionCard, onField, suspended, attacksAtMain, deckBottom }) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "ST23-13", as: "beatbreak" }],
            hand: [{ card: optionCard, as: "option" }],
            deck: ["BT1-001", "BT1-002"],
          },
          1: {
            battleArea: [{ card: "EX12-051", as: "diarbbitmon", suspended: optionCard === "ST23-09" }],
            hand: [{ card: "EX12-052", as: "evolution" }],
            deck: ["BT1-001", "BT1-002"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      s.state.memory = 10;
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId: s.perm("diarbbitmon").permanentId,
          instanceId: s.inst("evolution").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "EX12-052") &&
          s.state.pendingDecision === undefined,
      );
      const targetId = s.inst("evolution").instanceId;
      s.state.turnSeat = 0;
      s.state.memory = 10;
      expect(
        s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("option").instanceId) &&
          s.state.pendingDecision === undefined,
      );
      const remaining = s.state.players[1]!.battleArea.find((p) => p.permanentId === s.perm("diarbbitmon").permanentId);
      expect({
        onField: remaining !== undefined,
        suspended: remaining?.isSuspended ?? false,
        attacksAtMain: remaining?.attacksAtStartOfMainPhase ?? false,
        deckBottom: s.state.players[1]!.deck.at(-1)?.instanceId === targetId,
      }).toEqual({ onField, suspended, attacksAtMain, deckBottom });
    },
  );
});

it("1555938104404348949: Atratusmon's Digimon face bypasses Option-only immunity", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "ST23-08", as: "base" }],
        hand: [{ card: "ST23-09", as: "evolution" }],
        deck: ["BT1-001", "BT1-002"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "target" }],
        hand: [{ card: "BT19-089", as: "redCard" }],
        deck: ["BT1-001", "BT1-002"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.turnSeat = 1;
  s.state.memory = 10;
  await s.ready();
  const targetId = s.perm("target").topCard!.instanceId;
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("redCard").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.trash.some((c) => c.instanceId === s.inst("redCard").instanceId));
  expect(observe(s.engine).isRestrictedByEffect(s.perm("target"), "beAffected", "Option")).toBe(true);
  s.state.turnSeat = 0;
  s.state.memory = 10;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolution").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "ST23-09") &&
      s.state.pendingDecision === undefined,
  );
  expect(s.state.players[1]!.trash.some((c) => c.instanceId === targetId)).toBe(true);
});

it("1555938104404348949: inherited suspension on a DUAL Digimon bypasses Option-only immunity", async () => {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "BT26-056", as: "host", under: ["BT1-079"] }], deck: ["BT1-001", "BT1-002"] },
      1: {
        battleArea: [{ card: "BT1-009", as: "target" }],
        hand: [{ card: "BT19-089", as: "redCard" }],
        deck: ["BT1-001", "BT1-002"],
        security: ["BT1-001", "BT1-002"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.isFirstPlayersFirstTurn = false;
  s.state.turnSeat = 1;
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("redCard").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.trash.some((c) => c.instanceId === s.inst("redCard").instanceId));
  expect(observe(s.engine).isRestrictedByEffect(s.perm("target"), "beAffected", "Option")).toBe(true);
  s.state.turnSeat = 0;
  s.state.memory = 10;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  expect(s.perm("target").isSuspended).toBe(true);
});

it("1555938104404348949: Homeros borrows a DUAL Digimon effect without Option provenance", async () => {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT24-102", as: "homeros" },
          { card: "BT26-032", as: "lender" },
        ],
        hand: ["BT1-009"],
        deck: ["BT1-001", "BT1-002"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "target" }],
        hand: [{ card: "BT19-089", as: "redCard" }],
        deck: ["BT1-001", "BT1-002"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
  );
  preferred.push(s.perm("target").permanentId);
  s.state.turnSeat = 1;
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("redCard").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.trash.some((c) => c.instanceId === s.inst("redCard").instanceId));
  await duringMainPhase(s, 0, 3, async () => {});
  expect(s.perm("homeros").isSuspended).toBe(true);
  expect(s.perm("target").isSuspended).toBe(true);
});
