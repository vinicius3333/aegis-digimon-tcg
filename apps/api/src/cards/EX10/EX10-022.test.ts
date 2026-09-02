import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-022.js";
import "../index.js";

const CARD_ID = "EX10-022";

describe("EX10-022 Belphemon: Rage Mode", () => {
  it("verifies both start-main effects, the six-card buff, and conditional top-stack trash", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Belphemon: Sleep Mode"], cost: 1, isAlternate: true },
    ]);
    expect(
      compiled.effects?.find(
        (effect) => effect.trigger === "StartOfYourMainPhase" && effect.actions[0]?.kind === "Suspend",
      ),
    ).toMatchObject({
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
            count: "all",
          },
        },
        {
          kind: "GainKeyword",
          keyword: { keyword: "Piercing" },
          duration: "forTheTurn",
          condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 6 },
        },
        { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 2 }, duration: "forTheTurn" },
        { kind: "ModifyDP", amount: 3000, duration: "forTheTurn" },
      ],
    });
    for (const trigger of ["StartOfYourMainPhase", "OnPlay", "WhenDigivolving"]) {
      expect(
        compiled.effects?.find((effect) => effect.trigger === trigger && effect.actions[0]?.kind === "Delete"),
      ).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", suspended: true, kind: ["Digimon", "Tamer"] }, count: 1 },
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      actions: [
        {
          kind: "TrashDigivolution",
          amount: 1,
          fromTop: true,
          condition: {
            kind: "selfTopHasText",
            filter: { nameOrTrait: [{ tokens: ["Belphemon: Sleep Mode"], match: "name" }] },
          },
        },
      ],
    });
  });

  it("records the exact catalog and normal plus Sleep Mode evolution routes", async () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Green", "Purple"],
      level: 6,
      playCost: 14,
      dp: 14000,
      evoCosts: [
        { color: "Green", level: 5, memoryCost: 6 },
        { color: "Purple", level: 5, memoryCost: 6 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Demon Lord", "Seven Great Demon Lords"],
    });
    for (const [baseCard, cost] of [
      ["AD1-011", 6],
      ["BT10-081", 6],
      ["EX10-021", 1],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCard, as: "base" }], hand: [{ card: CARD_ID, as: "rage" }] },
      });
      s.state.memory = cost;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("rage").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === CARD_ID);
      expect(s.state.memory).toBe(0);
    }
  });

  it("at 6 hand cards suspends every level-5-or-lower target and gains the full turn buff", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rage" }],
          hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"],
        },
        1: {
          battleArea: [
            { card: "BT1-071", as: "low1" },
            { card: "BT10-081", as: "low2" },
            { card: "BT12-057", as: "high" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("low1").permanentId);
    const baseDp = s.perm("rage").currentDP;
    await advance(s.engine).fireForPermanent(EffectTiming.StartOfYourMainPhase, s.perm("rage"));
    await settle();
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).not.toContain(
      s.inst("low1").instanceId,
    );
    expect(s.perm("low2").isSuspended).toBe(true);
    expect(s.perm("high").isSuspended).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("rage"))).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("rage"), "SecurityAttack")).toBe(2);
    expect(s.perm("rage").currentDP).toBe(baseDp + 3000);
  });

  it("at 7 hand cards still suspends and deletes but gains none of the conditional buffs", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "rage" }],
        hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006", "BT1-007"],
      },
      1: { battleArea: [{ card: "BT1-071", as: "target" }] },
    });
    const baseDp = s.perm("rage").currentDP;
    await advance(s.engine).fireForPermanent(EffectTiming.StartOfYourMainPhase, s.perm("rage"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(observe(s.engine).hasPierce(s.perm("rage"))).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("rage"), "SecurityAttack")).toBe(0);
    expect(s.perm("rage").currentDP).toBe(baseDp);
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "%s deletes exactly 1 suspended Digimon or Tamer and ignores standing cards",
    async (timing) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: { battleArea: [{ card: CARD_ID, as: "rage" }] },
          1: {
            battleArea: [
              { card: "BT1-009", as: "digimon", suspended: true },
              { card: "BT1-085", as: "tamer", suspended: true },
              { card: "BT1-010", as: "standing" },
            ],
          },
        },
        { autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.perm("tamer").permanentId, s.perm("standing").permanentId);
      await advance(s.engine).fireForPermanent(timing, s.perm("rage"));
      expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).not.toContain(
        s.inst("tamer").instanceId,
      );
      expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual(
        expect.arrayContaining([s.inst("digimon").instanceId, s.inst("standing").instanceId]),
      );
    },
  );

  it("the inherited end-opponent-turn clause mandatorily trashes the top source only under Sleep Mode", async () => {
    const sleep = setupEngine({
      0: {
        battleArea: [
          {
            card: "EX10-021",
            as: "sleep",
            under: [
              { card: "BT10-081", as: "base" },
              { card: CARD_ID, as: "rageSource" },
            ],
          },
        ],
      },
    });
    sleep.state.turnSeat = 1;
    await advance(sleep.engine).fire(EffectTiming.EndOfOpponentsTurn, sleep.perm("sleep"));
    expect(sleep.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      sleep.inst("rageSource").instanceId,
    );
    expect(sleep.perm("sleep").stack.map(({ instanceId }) => instanceId)).toContain(sleep.inst("base").instanceId);

    const notSleep = setupEngine({
      0: { battleArea: [{ card: "BT12-057", as: "host", under: [{ card: CARD_ID, as: "rageSource" }] }] },
    });
    notSleep.state.turnSeat = 1;
    await advance(notSleep.engine).fire(EffectTiming.EndOfOpponentsTurn, notSleep.perm("host"));
    expect(notSleep.perm("host").stack.map(({ instanceId }) => instanceId)).toContain(
      notSleep.inst("rageSource").instanceId,
    );
  });

  it("the Sleep Mode gate reads the host's NAME, so a Rage Mode host does not satisfy it", async () => {
    // EX10-022's own printed text contains "[Belphemon: Sleep Mode]" in its [Digivolve] line, so
    // a `match: "text"` gate would fire here even though this Digimon IS NOT Sleep Mode.
    const rageHost = setupEngine({
      0: {
        battleArea: [
          {
            card: CARD_ID,
            as: "host",
            under: [
              { card: "BT10-081", as: "base" },
              { card: CARD_ID, as: "rageSource" },
            ],
          },
        ],
      },
    });
    rageHost.state.turnSeat = 1;
    await advance(rageHost.engine).fire(EffectTiming.EndOfOpponentsTurn, rageHost.perm("host"));
    expect(rageHost.perm("host").stack.map(({ instanceId }) => instanceId)).toContain(
      rageHost.inst("rageSource").instanceId,
    );
    expect(rageHost.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(
      rageHost.inst("rageSource").instanceId,
    );
  });

  it("Fortitude replays Rage Mode only when deletion had a digivolution card", async () => {
    const withSource = setupEngine(
      { 0: { battleArea: [{ card: CARD_ID, as: "rage", under: [{ card: "BT10-081", as: "source" }] }] } },
      { autoDeclineOptional: true },
    );
    const rageId = withSource.inst("rage").instanceId;
    await advance(withSource.engine).verb.deletePermanent([withSource.perm("rage").permanentId], "byEffect");
    await settle(() => withSource.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === rageId));
    expect(withSource.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      withSource.inst("source").instanceId,
    );

    const withoutSource = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "rage" }] } });
    await advance(withoutSource.engine).verb.deletePermanent([withoutSource.perm("rage").permanentId], "byEffect");
    expect(withoutSource.state.players[0]!.battleArea).toHaveLength(0);
  });
});
